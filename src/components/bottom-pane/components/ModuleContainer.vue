<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import Eye from '../../icons/Eye.vue';
import EyeNot from '../../icons/EyeNot.vue';

const props = defineProps<{
    title: string,
    padding?: boolean
    noCollapse?: boolean
    defaultCollapsed?: boolean
}>();

const collapsed = ref(false);
const mainContainer = ref<HTMLDivElement | null>(null);
const collapsible = ref(true);

watchEffect(() => {
    collapsible.value = !props.noCollapse;
    
    collapsed.value = props.defaultCollapsed ?? false;
});

const toggleCollapse = () => {
    if (props.noCollapse) return;
    collapsed.value = !collapsed.value;
}
</script>

<template>
    <div class="module-container" ref="mainContainer">
        <div id="title-rotator" >
            <div id="title">
                <span>
                    {{ title }}
                </span>
                <div id="icons-slot-container">
                    <span class="click-icon" v-if="collapsible" :onClick="toggleCollapse">
                        <span v-if="collapsed">
                            <Eye />
                        </span>
                        <span v-else>
                            <EyeNot />
                        </span>
                    </span>
                    <slot name="icons"></slot>
                </div>
            </div>

        </div>
        <div id="slot-container" :class="{ padding: padding && !collapsed }">
            <template v-if="!collapsed">
                <slot></slot>
            </template>
        </div>
    </div>
</template>
<style scoped>
#slot-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}

.padding {
    padding: 0.2em;
    margin: 0.3em;
}

.module-container {
    display: flex;
    flex-direction: row;
    height: 18em;
    padding-left: 2em;
    background-color: #92909b80;
    border: 1px solid #aaac;
    border-radius: 1em;
    box-sizing: border-box;
    /* overflow: hidden; */
    position: relative;

}

#title {
    position: absolute;
    bottom: 0.8em;
    transform-origin: left top;
    transform: translate(0, 100%) rotate(-90deg);
    /* nowrap */
    white-space: nowrap;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 16.5em;
    height: 0.9em;
}

#icons-slot-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
}

.click-icon {
    cursor: pointer;
    margin-left: 0.5em;
    opacity: 0.5;
}

.click-icon svg {
    position: relative;
    top: 2px
}

.click-icon:hover {
    opacity: 1;
}

#title-rotator {
    position: absolute;
    top: -0.6em;
    left: 0.05em;
    width: 1.6em;
    height: 100%;
    margin: 0.6em;
    box-sizing: border-box;
    overflow: hidden;
}

@media (prefers-color-scheme: light) {
    .module-container {
        background-color: #e4e4e4;
    }
}
</style>