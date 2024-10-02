<script setup lang="ts">
import { ref } from 'vue'
import Modal from '../modals/Modal.vue';
import {userShownDisclaimerLocalStorageKey, disclaimer} from '../texts/userDisclaimer'
import userSettingsStorageFactory from '@/store/userSettingsStorageFactory';

const nsLocalStorage = userSettingsStorageFactory()
const disclaimerShown = ref(await nsLocalStorage.getItem(userShownDisclaimerLocalStorageKey) === 'true')

const disclaimerOkButtonPressed = () => {
    nsLocalStorage.setItem(userShownDisclaimerLocalStorageKey, 'true')
    disclaimerShown.value = true
}

</script>
<template>
    <Modal v-if="!disclaimerShown" 
        id="start-disclaimer"
        name="user-disclaimer" 
        :activateOnMount="true" 
        :onClose="disclaimerOkButtonPressed" 
        closeButton="ok"
    >
        <div>
            <h1>Disclaimer</h1>
            <p style="white-space: pre-wrap;">
                {{ disclaimer }}
            </p>
        </div>
    </Modal>
</template>