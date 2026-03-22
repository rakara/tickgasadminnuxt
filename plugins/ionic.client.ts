import { IonicVue } from '@ionic/vue'
import { addIcons } from 'ionicons'
import {
  gridOutline, cubeOutline, peopleOutline, personOutline,
  ellipsisHorizontalOutline, refreshOutline, addOutline,
  chevronForwardOutline, logOutOutline,
} from 'ionicons/icons'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(IonicVue, { mode: 'md' })

  addIcons({
    'grid-outline':                gridOutline,
    'cube-outline':                cubeOutline,
    'people-outline':              peopleOutline,
    'person-outline':              personOutline,
    'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
    'refresh-outline':             refreshOutline,
    'add-outline':                 addOutline,
    'chevron-forward-outline':     chevronForwardOutline,
    'log-out-outline':             logOutOutline,
  })
})
