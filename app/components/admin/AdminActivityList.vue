<script setup lang="ts">
import { activityActions } from '~~/shared/types/activity'
import { adminActionLabels, type AdminEvent, type AdminUserActivity } from '~~/shared/types/adminActivity'
import { formatFileSize } from '~/utils/file'
defineProps<{ userItems?: AdminUserActivity[]; adminItems?: AdminEvent[] }>()
const date = (value: string) => new Date(value).toLocaleString()
</script>
<template>
    <ul v-if="userItems?.length" class="m-0 list-none divide-y divide-divider p-0">
        <li v-for="item in userItems" :key="item.id" class="flex min-w-0 gap-3 py-4 first:pt-0 last:pb-0">
            <Icon name="solar:history-linear" class="mt-1 shrink-0 text-xl text-accent" aria-hidden="true" />
            <div class="min-w-0 flex-1"><div class="flex flex-wrap justify-between gap-2"><strong class="text-sm text-foreground">{{ activityActions[item.action] ?? item.action }}</strong><time :datetime="item.createdAt" class="text-xs text-muted">{{ date(item.createdAt) }}</time></div>
                <NuxtLink :to="`/admin/users/${item.userId}`" class="mt-1 inline-block break-all text-xs text-accent no-underline hover:underline">{{ item.username }}</NuxtLink>
                <p class="mb-0 mt-1 break-all text-sm text-content">{{ item.name }}</p><p v-if="item.previousName" class="mb-0 mt-1 break-all text-xs text-muted">Previously: {{ item.previousName }}</p><p v-if="item.location" class="mb-0 mt-1 break-all text-xs text-muted">Destination: {{ item.location }}</p><span class="mt-2 inline-block rounded bg-control px-2 py-1 text-[0.7rem] text-muted">{{ item.type }}</span>
            </div>
        </li>
    </ul>
    <ul v-else-if="adminItems?.length" class="m-0 list-none divide-y divide-divider p-0">
        <li v-for="item in adminItems" :key="item.id" class="flex min-w-0 gap-3 py-4 first:pt-0 last:pb-0"><Icon name="solar:shield-user-linear" class="mt-1 shrink-0 text-xl text-accent" aria-hidden="true" /><div class="min-w-0 flex-1"><div class="flex flex-wrap justify-between gap-2"><strong class="text-sm text-foreground">{{ adminActionLabels[item.action] }}</strong><time :datetime="item.createdAt" class="text-xs text-muted">{{ date(item.createdAt) }}</time></div><p class="mb-0 mt-1 break-all text-sm text-content">{{ item.username }}</p><p class="mb-0 mt-1 break-all text-xs text-muted">By {{ item.actorName }}{{ item.actorId ? '' : ' · account removed' }}</p><p v-if="item.roleBefore !== item.roleAfter" class="mb-0 mt-2 text-xs text-muted">Role: {{ item.roleBefore ?? '—' }} → {{ item.roleAfter ?? 'Removed' }}</p><p v-if="item.quotaBefore !== item.quotaAfter" class="mb-0 mt-1 text-xs text-muted">Quota: {{ item.quotaBefore === null ? '—' : formatFileSize(item.quotaBefore) }} → {{ item.quotaAfter === null ? 'Removed' : formatFileSize(item.quotaAfter) }}</p></div></li>
    </ul>
    <p v-else class="m-0 py-6 text-center text-sm text-muted">No activity matches these filters.</p>
</template>
