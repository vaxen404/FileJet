<script setup lang="ts">
import { activityActions } from '~~/shared/types/activity'
import { adminActionLabels, type AdminHistoryPage } from '~~/shared/types/adminActivity'
definePageMeta({layout:'admin',middleware:['auth','admin']})
useHead({title:'Activity history · FileJet Admin'})
const route=useRoute()
const source=ref<'user'|'admin'>(route.query.source==='admin'?'admin':'user'), userId=ref(typeof route.query.userId==='string'?route.query.userId:'')
const account=ref(''), actor=ref(''), search=ref(''), action=ref(''), type=ref(''), from=ref(''), to=ref('')
const data=ref<AdminHistoryPage|null>(null), loading=ref(false), error=ref('')
let generation=0, timer:ReturnType<typeof setTimeout>|undefined
const load=async(more=false)=>{
    clearTimeout(timer); const current=++generation;loading.value=true;error.value=''
    try{
        const until=to.value?new Date(to.value+'T00:00:00'):null;if(until)until.setDate(until.getDate()+1)
        const result=await $fetch<AdminHistoryPage>('/api/admin/activity',{query:{source:source.value,userId:userId.value||undefined,user:account.value||undefined,actor:source.value==='admin'?actor.value||undefined:undefined,q:search.value||undefined,action:action.value||undefined,type:source.value==='user'?type.value||undefined:undefined,from:from.value?new Date(from.value+'T00:00:00').toISOString():undefined,to:until?.toISOString(),cursor:more?data.value?.nextCursor??undefined:undefined}})
        if(current!==generation)return
        if(more&&data.value?.source===result.source)result.items=[...data.value.items,...result.items] as typeof result.items
        data.value=result
    }catch(err:any){if(current===generation)error.value=err.data?.message||'Could not load administration history.'}
    finally{if(current===generation)loading.value=false}
}
const changed=()=>{++generation;clearTimeout(timer);data.value=null;loading.value=true;timer=setTimeout(()=>load(),300)}
watch(source,()=>{action.value='';type.value='';actor.value='';changed()})
watch([userId,account,actor,search,action,type,from,to],changed)
watch(()=>[route.query.source,route.query.userId],()=>{source.value=route.query.source==='admin'?'admin':'user';userId.value=typeof route.query.userId==='string'?route.query.userId:'';changed()})
const clear=()=>{userId.value='';account.value='';actor.value='';search.value='';action.value='';type.value='';from.value='';to.value=''}
onMounted(()=>load())
onBeforeUnmount(()=>{++generation;clearTimeout(timer)})
</script>
<template>
    <div class="space-y-5"><div class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="text-2xl font-semibold text-foreground">Activity history</h1><p class="mt-2 text-sm text-muted">Browse account activity and changes made through administration.</p></div><button type="button" class="admin-history-button" :disabled="loading" @click="load()"><Icon name="solar:refresh-linear" />Refresh</button></div>
        <div class="flex flex-wrap gap-2"><button type="button" class="admin-history-button" :class="{'bg-accent/15! text-accent!':source==='user'}" :aria-pressed="source==='user'" @click="source='user'">User activity</button><button type="button" class="admin-history-button" :class="{'bg-accent/15! text-accent!':source==='admin'}" :aria-pressed="source==='admin'" @click="source='admin'">Admin actions</button></div>
        <div class="grid grid-cols-3 gap-3 rounded-2xl border border-divider bg-surface p-4 max-[1000px]:grid-cols-2 max-mobile:grid-cols-1">
            <label class="admin-history-label">{{ source==='user'?'Item name':'Search names' }}<input v-model="search" aria-label="Search history" type="search" maxlength="120" placeholder="Search…" class="admin-history-input" /></label>
            <label class="admin-history-label">Account<input v-model="account" aria-label="Account username" type="search" maxlength="100" placeholder="Username" class="admin-history-input" /></label>
            <label v-if="source==='admin'" class="admin-history-label">Administrator<input v-model="actor" aria-label="Administrator username" type="search" maxlength="100" placeholder="Who made the change" class="admin-history-input" /></label>
            <label v-else class="admin-history-label">Type<select v-model="type" aria-label="Item type" class="admin-history-input"><option value="">All types</option><option v-for="kind in ['file','folder','note','inbox','batch']" :key="kind" :value="kind">{{ kind }}</option></select></label>
            <label class="admin-history-label">Action<select v-model="action" aria-label="History action" class="admin-history-input"><option value="">All actions</option><option v-for="(label,key) in source==='user'?activityActions:adminActionLabels" :key="key" :value="key">{{ label }}</option></select></label>
            <label class="admin-history-label">From<input v-model="from" aria-label="History from" type="date" class="admin-history-input" /></label><label class="admin-history-label">To<input v-model="to" aria-label="History to" type="date" class="admin-history-input" /></label>
            <div class="col-span-full flex flex-wrap items-center gap-2"><span v-if="userId" class="break-all text-xs text-muted">Account ID: {{ userId }}</span><button type="button" class="admin-history-button ml-auto" @click="clear">Clear filters</button></div>
        </div>
        <section class="rounded-2xl border border-divider bg-surface p-5 max-mobile:p-4"><p class="mb-4 mt-0 text-xs leading-5 text-muted">{{ source==='user'?'Recorded file, folder and note changes across accounts. File and note contents are not shown.':'Successful account changes include the administrator and before/after role and quota. Records remain after account deletion.' }}</p><p v-if="error" role="alert" class="mb-4 text-sm text-danger">{{ error }}</p><p v-if="loading&&!data" role="status" class="py-5 text-sm text-muted">Loading history…</p><AdminActivityList v-else :user-items="data?.source==='user'?data.items:[]" :admin-items="data?.source==='admin'?data.items:[]" /><button v-if="data?.nextCursor" type="button" class="admin-history-button mx-auto mt-5 flex" :disabled="loading" @click="load(true)">Load more</button></section>
    </div>
</template>
<style scoped>
@reference "~/assets/css/tailwind.css";
.admin-history-button { @apply inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-control-border bg-surface px-4 text-sm text-content cursor-pointer hover:bg-control disabled:opacity-50 disabled:cursor-not-allowed; }
.admin-history-label { @apply flex min-w-0 flex-col gap-2 text-xs text-muted; }
.admin-history-input { @apply min-h-11 w-full min-w-0 rounded-lg border border-control-border bg-input px-3 py-2 text-sm text-content outline-none focus:border-accent; }
</style>
