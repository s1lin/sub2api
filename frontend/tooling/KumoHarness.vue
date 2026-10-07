<script setup lang="ts">
import { ref } from 'vue'
import type { RechargeBonusTierDraft } from '@/utils/rechargeBonus'
import RechargeBonusTierEditor from '@/components/admin/settings/RechargeBonusTierEditor.vue'
import BackupArchiveSettings from '@/components/admin/BackupArchiveSettings.vue'
import CodexManifestAccountsField from '@/components/admin/group/CodexManifestAccountsField.vue'
import { KumoCollapsible, KumoCollapsibleTrigger, KumoCollapsiblePanel, KumoSurface } from '@/components/kumo'
import DataTable from '@/components/common/DataTable.vue'
import Select from '@/components/common/Select.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import AccountActionMenu from '@/components/admin/account/AccountActionMenu.vue'
import TotpSetupModal from '@/components/user/profile/TotpSetupModal.vue'
import { KumoContextMenu, KumoContextMenuTrigger, KumoNativeSelect } from '@/components/kumo'
import type { Account } from '@/types'
import Pagination from '@/components/common/Pagination.vue'
import { KumoButton, KumoDropdown, KumoDropdownTrigger, KumoDropdownContent, KumoDropdownItem, KumoInput, KumoCheckbox, KumoRadioGroup, KumoRadio, KumoTabs, KumoMultiSelect, KumoToasts, KumoSwitch, KumoLabel, KumoSearchSelect } from '@/components/kumo'
const options = ref([{ value: 'alpha', label: 'Alpha' }, { value: 'disabled', label: 'Disabled', disabled: true }, { value: 'beta', label: 'Beta' }, { value: 'gamma', label: 'Gamma' }])
const plain = ref('alpha'), search = ref('gamma'), menu = ref(false), action = ref(''), dialog = ref(false), nested = ref(false), page = ref(1)
const start = ref('2026-09-13'), end = ref('2026-09-13'), formText = ref(''), checked = ref(false), choice = ref('a'), tab = ref('one')
const multiple = ref<string[]>([]), toasts = ref<{ id: string; message: string; type: string }[]>([])
const enabled = ref(false)
const contextOpen = ref(false), contextAction = ref(''), accountOpen = ref(false), accountCloses = ref(0)
const accountAnchor = ref<DOMRect | null>(null)
const menuAccount = { id: 1, name: 'Example account', platform: 'openai', type: 'oauth', status: 'error' } as Account
function openAccountMenu(event: MouseEvent) { accountAnchor.value = (event.currentTarget as HTMLElement).getBoundingClientRect(); accountOpen.value = true; accountCloses.value = 0 }
const query = ref(''), queryOpen = ref(false), selectedResult = ref(0)
const selectMode = ref('remote'), selectChange = ref('')
const totpOpen = ref(false)
const bonus = ref<RechargeBonusTierDraft[]>([{ min_amount: 100, bonus_percent: 20 }])
const bonusMode = ref<'bonus' | 'discount'>('bonus')
const archive = ref({ enabled: true, days: [1], include_month_end: false, retain_count: 12 })
const manifest = ref({ enabled: true, account_ids: [] as number[], fallback_to_scheduler: true })
const currency = ref('CNY')
const results = ref([{ id: 1, label: 'First result' }, { id: 2, label: 'Second result' }])
</script>
<template>
  <main class="mx-auto max-w-2xl space-y-6 p-6">
    <h1>Kumo interaction verification</h1>
    <KumoCollapsible><KumoCollapsibleTrigger>Advanced options</KumoCollapsibleTrigger><KumoCollapsiblePanel><KumoInput aria-label="Advanced value" /></KumoCollapsiblePanel></KumoCollapsible>
    <KumoButton href="https://example.com/docs" target="_blank" rel="noopener noreferrer">Documentation link</KumoButton>
    <KumoSurface data-test="keyed-text"><span>10<template v-if="currency"> {{ currency }}</template></span></KumoSurface>
    <RechargeBonusTierEditor v-model="bonus" v-model:mode="bonusMode" />
    <BackupArchiveSettings v-model="archive" /><output class="block break-all" data-test="archive-value">{{ JSON.stringify(archive) }}</output>
    <CodexManifestAccountsField v-model="manifest" />
    <DataTable data-test="sortable-table" :columns="[{ key: 'name', label: 'Name', sortable: true }]" :data="[{ id: 1, name: 'Beta' }, { id: 2, name: 'Alpha' }]" default-sort-key="name"><template #header-name><span>Name</span></template></DataTable>
    <KumoButton @click="totpOpen = true">Set up verification</KumoButton>
    <TotpSetupModal v-if="totpOpen" @close="totpOpen = false" @success="totpOpen = false" />
    <KumoContextMenu v-model="contextOpen"><KumoContextMenuTrigger @click="contextAction = 'copied'">Proxy address</KumoContextMenuTrigger><KumoDropdownContent><KumoDropdownItem @click="contextAction = 'username'">Copy username</KumoDropdownItem><KumoDropdownItem @click="contextAction = 'password'">Copy password</KumoDropdownItem></KumoDropdownContent></KumoContextMenu>
    <output data-test="context-action">{{ contextAction }}</output>
    <KumoButton data-test="account-anchor" @click="openAccountMenu">Account actions</KumoButton>
    <AccountActionMenu :show="accountOpen" :account="menuAccount" :anchor-rect="accountAnchor" @close="accountOpen = false; accountCloses++" @test="action = 'account-test'" />
    <output data-test="account-closes">{{ accountCloses }}</output>
    <KumoNativeSelect v-model="selectMode" aria-label="Catalog mode" @change="selectChange = $event.target.value"><option value="remote">Remote catalog</option><option value="file">Local file</option></KumoNativeSelect>
    <output data-test="catalog-mode">{{ selectMode }} / {{ selectChange }}</output>
    <div><KumoSearchSelect v-model="query" v-model:open="queryOpen" :options="results" placeholder="Remote search" @select="result => { selectedResult = result.id; query = result.label; queryOpen = false }" /></div>
    <output data-test="remote-result">{{ selectedResult }} / {{ query }}</output>
    <div data-test="plain"><Select v-model="plain" :options="options" :searchable="false" placeholder="Plain selection" /><output>{{ plain }}</output></div>
    <div data-test="search"><Select v-model="search" :options="options" searchable placeholder="Search selection" /><output>{{ search }}</output></div>
    <KumoDropdown v-model="menu"><KumoDropdownTrigger>Actions</KumoDropdownTrigger><KumoDropdownContent><KumoDropdownItem @click="action = 'first'">First action</KumoDropdownItem><KumoDropdownItem disabled>Disabled action</KumoDropdownItem><KumoDropdownItem @click="action = 'last'">Last action</KumoDropdownItem></KumoDropdownContent></KumoDropdown>
    <output data-test="action">{{ action }}</output>
    <KumoButton @click="formText = 'restored'">Restore form</KumoButton>
    <KumoButton @click="options = [{ value: 'result', label: 'Result' }, { value: 'other', label: 'Other' }, { value: 'disabled', label: 'Disabled', disabled: true }]">Replace options</KumoButton>
    <KumoButton @click="dialog = true">Open dialog</KumoButton>
    <BaseDialog :show="dialog" title="Parent dialog" close-on-click-outside @close="dialog = false"><KumoInput aria-label="Dialog text" /><KumoButton @click="nested = true">Open nested dialog</KumoButton><BaseDialog :show="nested" title="Nested dialog" @close="nested = false">Nested content</BaseDialog></BaseDialog>
    <DateRangePicker v-model:start-date="start" v-model:end-date="end" /><output data-test="range">{{ start }} / {{ end }}</output>
    <HelpTooltip content="Hover details" /><HelpTooltip content="Click details" trigger="click" />
    <Pagination v-model:page="page" :page-size="20" :total="200" :show-page-size-selector="false" /><output data-test="page">{{ page }}</output>
    <form @submit.prevent="action = 'submitted'"><KumoInput v-model="formText" aria-label="Required value" name="value" required /><KumoCheckbox v-model="checked" aria-label="Consent" name="consent" /><KumoRadioGroup v-model="choice" name="choice"><KumoRadio value="a" aria-label="Choice A" /><KumoRadio value="b" aria-label="Choice B" /></KumoRadioGroup><KumoButton type="submit">Submit form</KumoButton></form>
    <KumoTabs v-model="tab" aria-label="Example tabs" :activate-on-focus="true" :tabs="[{ value: 'one', label: 'Tab one' }, { value: 'two', label: 'Tab two' }]" /><output data-test="tab">{{ tab }}</output>
    <KumoMultiSelect v-model="multiple" label="Multiple models" :options="[{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }]" :summary="multiple.length ? multiple.join(', ') : 'All models'" all-label="All models" /><output data-test="multiple">{{ multiple.join(',') }}</output>
    <KumoSwitch v-model="enabled" aria-label="Enabled setting" /><output data-test="enabled">{{ enabled }}</output>
    <KumoLabel v-for="value in ['a', 'b']" :key="value"><KumoCheckbox :disabled="!enabled" :aria-label="`Dependent ${value}`" />Dependent {{ value }}</KumoLabel>
    <KumoButton @click="toasts = [{ id: 'saved', type: 'success', message: 'Changes saved' }]">Show toast</KumoButton>
    <KumoToasts :toasts="toasts" @dismiss="toasts = toasts.filter(toast => toast.id !== $event)" /><output data-test="toasts">{{ toasts.length }}</output>
  </main>
</template>
