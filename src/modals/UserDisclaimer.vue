<script setup lang="ts">
import { ref } from 'vue'
import Modal from '../modals/Modal.vue';
import {userShownDisclaimerLocalStorageKey, disclaimer} from '../texts/userDisclaimer'
import nsLocalStorage from '../functions/nsLocalStorage'
const disclaimerShown = ref(nsLocalStorage.getItem(userShownDisclaimerLocalStorageKey) === 'true')

const disclaimerOkButtonPressed = () => {
    nsLocalStorage.setItem(userShownDisclaimerLocalStorageKey, 'true')
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