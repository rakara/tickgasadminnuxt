<script setup lang="ts">
definePageMeta({ layout: false })
const { isAuthenticated } = useAuth()
navigateTo(isAuthenticated.value ? '/app/dashboard' : '/login', { replace: true })
</script>
