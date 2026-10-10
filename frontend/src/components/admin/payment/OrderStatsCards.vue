<template>
  <MetricStrip>
    <section class="stat-card">
      <div class="min-w-0 flex-1">
        <p class="stat-label truncate">{{ t('payment.admin.todayRevenue') }}</p>
        <p v-for="[currency, amount] in sortedAmounts(stats.today_amount)" :key="currency" class="stat-value mt-1">
          {{ formatMoney(currency, amount) }}
        </p>
        <p class="mt-1 text-xs text-[var(--brand-muted)]">
          {{ stats.today_count }} {{ t('payment.admin.orders') }}
        </p>
      </div>
    </section>

    <section class="stat-card">
      <div class="min-w-0 flex-1">
        <p class="stat-label truncate">{{ t('payment.admin.totalRevenue') }}</p>
        <p v-for="[currency, amount] in sortedAmounts(stats.total_amount)" :key="currency" class="stat-value mt-1">
          {{ formatMoney(currency, amount) }}
        </p>
        <p class="mt-1 text-xs text-[var(--brand-muted)]">
          {{ stats.total_count }} {{ t('payment.admin.orders') }}
        </p>
      </div>
    </section>

    <section class="stat-card">
      <div class="min-w-0 flex-1">
        <p class="stat-label truncate">{{ t('payment.admin.todayOrders') }}</p>
        <p class="stat-value mt-1">{{ stats.today_count }}</p>
      </div>
    </section>

    <section class="stat-card">
      <div class="min-w-0 flex-1">
        <p class="stat-label truncate">{{ t('payment.admin.avgAmount') }}</p>
        <p v-for="[currency, amount] in sortedAmounts(stats.avg_amount)" :key="currency" class="stat-value mt-1">
          {{ formatMoney(currency, amount) }}
        </p>
      </div>
    </section>
  </MetricStrip>
</template>

<script setup lang="ts">
import MetricStrip from '@/components/common/MetricStrip.vue'
import { useI18n } from 'vue-i18n'
import type { CurrencyAmounts, DashboardStats } from '@/types/payment'

const { t } = useI18n()

defineProps<{
  stats: DashboardStats
}>()

function sortedAmounts(amounts: CurrencyAmounts): [string, number][] {
  return Object.entries(amounts).sort(([left], [right]) => left.localeCompare(right))
}

function formatMoney(currency: string, amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}
</script>
