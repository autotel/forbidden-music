<script setup lang="ts">
import { ref } from 'vue'
import Modal from '../modals/Modal.vue';
import {userShownDisclaimerLocalStorageKey, disclaimer} from '../texts/userDisclaimer'
const disclaimerShown = ref(localStorage.getItem(userShownDisclaimerLocalStorageKey) === 'true')

const disclaimerOkButtonPressed = () => {
    localStorage.setItem(userShownDisclaimerLocalStorageKey, 'true')
    disclaimerShown.value = true
}

</script>
<template>
    <Modal v-if="!disclaimerShown" name="user-disclaimer" :activateOnMount="true" :onClose="disclaimerOkButtonPressed" closeButton="ok">
        <div>
            <h1>Disclaimer</h1>
            <p>
                {{ disclaimer }}
            </p>
        </div>
    </Modal>
</template>