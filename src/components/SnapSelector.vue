<script setup lang="ts">
import { ref } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { useSnapStore } from '../store/snapStore';
import { useToolStore } from '../store/toolStore';

import Button from './Button.vue';

const tool = useToolStore();
const snap = useSnapStore();

</script>

<template>
  <Button 
    v-for="(isnap,snapName) in snap.snaps" 
    :onClick="()=>snap.snaps[snapName] = !snap.snaps[snapName]"
    :class="{active: snap.snaps[snapName]}"
  >
    {{ snapName }}
  </Button>  
</template>

<style scoped>
.active {
  background-color: #888;
  /* color: rgb(196, 0, 0); */
}
</style>
