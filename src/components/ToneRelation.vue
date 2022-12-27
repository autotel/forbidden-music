<template v-for="relation in toneRelations">
    <line class="relation" :x1="relation.xPosition" :y1="noteRect.y" :x2="relation.xPosition"
        :y2="noteRect.y + relation.distancePx" />
    <text :x="relation.xPosition + 5" :y="5 + noteRect.y + relation.distancePx / 2" font-size="10">
        {{ relation.text }}
    </text>
</template>