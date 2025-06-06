<script setup lang="ts">
import { onMounted, onUnmounted, readonly, ref, computed } from 'vue';
import { useViewStore } from '@/store/viewStore';

// Store
const view = useViewStore();

// Refs and state
const wheelRef = ref<HTMLElement | null>(null);
const draggerRef = ref<HTMLElement | null>(null);
const prevAngle = ref<number | null>(null);
const rotation = ref(0); // Total accumulated rotation
const direction = ref(0); // -1 for CCW, 0 for no movement, 1 for CW

const wheelScreenPosition = computed(() => {
    return {
        left: view.viewWidthPx - 170,
        top:50
    }
})

let isDraggingWheel = false;
let isDraggingJoystick = false;
let lastRotation = 0;
let lastMousePosition = { x: 0, y: 0 };

// Utility functions
const normalizeAngleDelta = (delta: number) => {
    // Normalize to [-π, π] range
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
}

const getAngleFromCenter = (x: number, y: number, centerX: number, centerY: number) => {
    return Math.atan2(y - centerY, x - centerX);
}

const detectDirection = (mouseX: number, mouseY: number, wheelCenterX: number, wheelCenterY: number) => {
    const currentAngle = getAngleFromCenter(mouseX, mouseY, wheelCenterX, wheelCenterY);

    if (prevAngle.value !== null) {
        const rawDelta = currentAngle - prevAngle.value;
        const normalizedDelta = normalizeAngleDelta(rawDelta);

        // Update total rotation (this will keep growing/shrinking without wrapping)
        rotation.value += normalizedDelta;

        // Determine direction
        if (Math.abs(normalizedDelta) > 0.01) { // Small threshold to avoid jitter
            direction.value = normalizedDelta > 0 ? 1 : -1; // 1 = CW, -1 = CCW
        } else {
            direction.value = 0; // No significant movement
        }
    }

    prevAngle.value = currentAngle;

    return {
        angle: currentAngle,
        delta: prevAngle.value !== null ? normalizeAngleDelta(currentAngle - prevAngle.value) : 0,
        direction: direction.value,
        totalRotation: rotation.value
    };
}

const reset = () => {
    prevAngle.value = null;
    rotation.value = 0;
    direction.value = 0;
    lastRotation = 0;
}

// Wheel event handlers
const handleWheelMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    isDraggingWheel = true;
    // Reset when starting a new drag
    reset();
}

const handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    if (isDraggingWheel) {
        handleWheelMouseMove(event);
    } else if (isDraggingJoystick) {
        handleJoystickMouseMove(event);
    }
}

const handleMouseUp = (event: MouseEvent) => {
    event.preventDefault();
    if (isDraggingWheel) {
        handleWheelMouseUp();
    } else if (isDraggingJoystick) {
        handleJoystickMouseUp();
    }
}
const handleWheelMouseMove = (event: MouseEvent) => {
    if (!wheelRef.value) return;

    const rect = wheelRef.value.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const windowCenterX = window.innerWidth / 2;
    const windowCenterY = window.innerHeight / 2;

    const result = detectDirection(
        event.clientX,
        event.clientY,
        centerX,
        centerY
    );

    const rotationDelta = result.totalRotation - lastRotation;
    lastRotation = result.totalRotation;

    view.zoomAround(view.viewHeightOctaves ** (1 + rotationDelta / 10), windowCenterX, windowCenterY);
}

const handleWheelMouseUp = () => {
    isDraggingWheel = false;
}

// Joystick event handlers
const handleJoystickMouseDown = (event: MouseEvent) => {
    isDraggingJoystick = true;
    lastMousePosition = { x: event.clientX, y: event.clientY };
}

const handleJoystickMouseMove = (event: MouseEvent) => {
    if (!isDraggingJoystick || !draggerRef.value) return;

    const mousePosition = { x: event.clientX, y: event.clientY };
    const deltaX = mousePosition.x - lastMousePosition.x;
    const deltaY = mousePosition.y - lastMousePosition.y;

    lastMousePosition = mousePosition;

    const newViewTimeOffset = view.timeOffset - view.pxToTime(deltaX * 5);
    if (newViewTimeOffset > 0) {
        view.timeOffset = newViewTimeOffset;
    }

    view.octaveOffset += view.pxToOctave(deltaY * 5);
}

const handleJoystickMouseUp = () => {
    isDraggingJoystick = false;
}

// Lifecycle hooks
onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
    <div class="zoom-wheel" ref="wheelRef" @mousedown="handleWheelMouseDown"
        :style="{ left: wheelScreenPosition.left + 'px', top: wheelScreenPosition.top + 'px' }">
        <div class="position-dragger" ref="draggerRef" @mousedown.stop="handleJoystickMouseDown"></div>
    </div>
</template>

<style scoped>
.zoom-wheel {
    position: absolute;
    width: 130px;
    height: 130px;
    background-color: #e4e4e4;
    border-radius: 50%;
    overflow: hidden;
    border: solid 2px;
}

/** concentric circle inside zoom wheel */
.position-dragger {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 60px;
    height: 60px;
    background-color: #c2c2c2;
    border-radius: 50%;
    transform: translate(-50%, -50%);
}

.deltaDisplay {
    position: absolute;
    top: 0;
    left: 0;
    background-color: #000;
    color: #fff;
}
</style>