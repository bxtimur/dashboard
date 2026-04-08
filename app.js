function toggleAlert(id) {
    document.getElementById(id).classList.toggle('expanded')
}

function escapeHtml(text) {
    const el = document.createElement('div')
    el.textContent = text
    return el.innerHTML
}

function ruActiveSummary(n) {
    if (n === 1) return '1 активен'
    if (n >= 2 && n <= 4) return n + ' активны'
    return n + ' активных'
}

function updateAgentsHeaderSummary() {
    const wrap = document.getElementById('agents-summary')
    const list = document.querySelector('.agents-list')
    if (!wrap || !list) return
    let active = 0
    let queued = 0
    list.querySelectorAll('.agent-card').forEach((card) => {
        const label = card.querySelector('.agent-status-label')
        if (!label) return
        if (label.classList.contains('queued')) queued += 1
        else if (label.classList.contains('active')) active += 1
    })
    const chunks = []
    if (active > 0) {
        chunks.push(
            '<span class="agents-summary-item agents-summary-item--active">' +
                '<span class="agent-status-dot active"></span>' +
                '<span>' +
                ruActiveSummary(active) +
                '</span></span>',
        )
    }
    if (queued > 0) {
        chunks.push(
            '<span class="agents-summary-item agents-summary-item--queued">' +
                '<span class="agent-status-dot queued"></span>' +
                '<span>' +
                queued +
                ' в очереди</span></span>',
        )
    }
    wrap.innerHTML = chunks.length
        ? chunks.join('<span class="agents-summary-sep">·</span>')
        : '<span class="agents-summary-empty">нет задач</span>'
}

function addQueuedAgent(agentName, taskDesc) {
    const list = document.querySelector('.agents-list')
    if (!list) return
    const card = document.createElement('div')
    card.className = 'agent-card'
    card.innerHTML =
        '<div class="agent-top">' +
        '<div class="agent-name">' +
        '<span class="agent-status-dot queued"></span>' +
        escapeHtml(agentName) +
        '</div>' +
        '<span class="agent-status-label queued">В очереди</span>' +
        '</div>' +
        '<div class="agent-task"></div>' +
        '<div class="agent-meta agent-meta--queued">' +
        '<span>Ожидает запуска</span>' +
        '</div>'
    card.querySelector('.agent-task').textContent = taskDesc
    list.appendChild(card)
    updateAgentsHeaderSummary()
}

function sendTask(btn, agentName, taskDesc) {
    const alert = btn.closest('.alert')
    const sentEl = document.getElementById(alert.id + '-sent')
    alert.querySelector('.alert-actions').style.display = 'none'
    sentEl.classList.add('visible')
    sentEl.querySelector('.task-sent-text').innerHTML =
        '<strong>Задача отправлена → ' + agentName + '</strong><br>' + taskDesc
    addQueuedAgent(agentName, taskDesc)
}

document.addEventListener('DOMContentLoaded', updateAgentsHeaderSummary)

const CHANNEL_MAP_KEYS = ['wb', 'oz', 'ym', 'st']
const CHANNEL_REVENUE_M = { wb: 5.95, oz: 3.47, ym: 1.74, st: 3.12 }

function fmtChannelMillion(v) {
    const x = Math.round(v * 100) / 100
    if (Number.isInteger(x)) return x + 'М'
    return x.toFixed(2).replace(/0$/, '').replace(/\.$/, '') + 'М'
}

function channelValuesForMetric(metric) {
    const out = {}
    CHANNEL_MAP_KEYS.forEach((k) => {
        const r = CHANNEL_REVENUE_M[k]
        if (metric === 'profit') {
            out[k] = k === 'st' ? r / 5 : r / 7
        } else {
            out[k] = r
        }
    })
    return out
}

function channelPctWidths(values) {
    const t = CHANNEL_MAP_KEYS.reduce((s, k) => s + values[k], 0)
    const rounded = {}
    let sum = 0
    CHANNEL_MAP_KEYS.slice(0, 3).forEach((k) => {
        rounded[k] = Math.max(1, Math.round((values[k] / t) * 100))
        rounded[k] = Math.min(rounded[k], 97)
        sum += rounded[k]
    })
    rounded.st = Math.max(1, 100 - sum)
    return rounded
}

function randomChannelTrendPct() {
    let n = 0
    while (n === 0) {
        n = Math.floor(Math.random() * 35) - 17
    }
    return n
}

function renderChannelMap(metric) {
    const vals = channelValuesForMetric(metric)
    const pct = channelPctWidths(vals)
    document.querySelectorAll('.ch-bars .ch-row').forEach((row) => {
        const key = row.dataset.channel
        if (!key || !CHANNEL_MAP_KEYS.includes(key)) return
        const fill = row.querySelector('.ch-fill')
        const valSpan = row.querySelector('.ch-fill span')
        const pctSpan = row.querySelector('.ch-pct')
        const trendSpan = row.querySelector('.ch-trend')
        if (!fill || !valSpan || !pctSpan || !trendSpan) return
        const w = pct[key]
        fill.style.width = `${w}%`
        valSpan.textContent = fmtChannelMillion(vals[key])
        pctSpan.textContent = `${w}%`
        const tr = randomChannelTrendPct()
        const neg = tr < 0
        const abs = Math.abs(tr)
        trendSpan.textContent = (neg ? '−' : '+') + abs + '%'
        trendSpan.classList.toggle('trend-neg', neg)
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('period-custom-panel')
    const fromInput = document.getElementById('period-from')
    const toInput = document.getElementById('period-to')
    const pageSub = document.getElementById('page-sub')
    const toolbar = document.querySelector('.time-pills')
    const wrap = document.querySelector('.period-controls')

    if (!panel || !fromInput || !toInput || !pageSub || !toolbar || !wrap) {
        return
    }

    const pills = [...toolbar.querySelectorAll('.pill[data-period]')]

    const formatRuLong = (iso) => {
        const [y, m, d] = iso.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        return dt.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    }

    const presetSubtitles = {
        day() {
            return new Date().toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })
        },
        week() {
            return wrap.dataset.defaultSub || ''
        },
        month() {
            return 'Март 2026'
        },
        quarter() {
            return '1 квартал 2026'
        },
    }

    const openNativeDatePicker = (input) => {
        if (typeof input.showPicker === 'function') {
            try {
                input.showPicker()
                return
            } catch (_) {
                /* не все контексты разрешают showPicker() */
            }
        }
        input.focus()
        try {
            input.click()
        } catch (_) {
            /* игнорируем */
        }
    }

    const syncDateBounds = () => {
        const from = fromInput.value
        const to = toInput.value
        if (from) {
            toInput.min = from
        } else {
            toInput.removeAttribute('min')
        }
        if (to) {
            fromInput.max = to
        } else {
            fromInput.removeAttribute('max')
        }
        if (from && to && from > to) {
            toInput.value = from
        }
    }

    const updateCustomSubtitle = () => {
        syncDateBounds()
        const from = fromInput.value
        const to = toInput.value
        if (from && to) {
            pageSub.textContent = `${formatRuLong(from)} - ${formatRuLong(to)}`
        }
    }

    const setActivePeriod = (key) => {
        pills.forEach((btn) => {
            const on = btn.dataset.period === key
            btn.classList.toggle('on', on)
            if (btn.dataset.period === 'custom') {
                btn.setAttribute('aria-expanded', on ? 'true' : 'false')
            }
        })

        const isCustom = key === 'custom'

        if (isCustom) {
            syncDateBounds()
            updateCustomSubtitle()
        } else {
            const fn = presetSubtitles[key]
            pageSub.textContent = fn ? fn() : wrap.dataset.defaultSub || ''
        }
    }

    document
        .querySelectorAll('#period-custom-panel .period-field')
        .forEach((field) => {
            const input = field.querySelector('input[type="date"]')
            if (!input) return
            field.addEventListener('click', (e) => {
                setActivePeriod('custom')
                if (e.target !== input) {
                    e.preventDefault()
                    openNativeDatePicker(input)
                }
            })
        })

    panel.addEventListener('focusin', () => {
        setActivePeriod('custom')
    })

    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill[data-period]')
        if (!btn) return
        setActivePeriod(btn.dataset.period)
    })

    fromInput.addEventListener('change', () => {
        setActivePeriod('custom')
    })
    toInput.addEventListener('change', () => {
        setActivePeriod('custom')
    })

    syncDateBounds()

    const metricToggle = document.querySelector('.channel-metric-toggle')
    if (metricToggle) {
        metricToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.channel-metric-btn')
            if (!btn) return
            const alreadyOn = btn.classList.contains('on')
            if (alreadyOn) return
            metricToggle
                .querySelectorAll('.channel-metric-btn')
                .forEach((b) => {
                    b.classList.toggle('on', b === btn)
                })
            renderChannelMap(btn.dataset.metric)
        })
    }

    const shuffleArray = (arr) => {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
        }
        return a
    }

    const randomUniqueInts = (count, min, max) => {
        const cap = max - min + 1
        const n = Math.min(count, cap)
        const s = new Set()
        while (s.size < n) {
            s.add(Math.floor(Math.random() * cap) + min)
        }
        return shuffleArray([...s])
    }

    const topSkuList = document.getElementById('top-sku-list')
    if (topSkuList) {
        const rows = [...topSkuList.querySelectorAll('.sku-data')]
        const stocks = randomUniqueInts(rows.length, 12, 4000)
        const days = randomUniqueInts(rows.length, 2, 200)
        rows.forEach((row, i) => {
            const st = row.querySelector('.sku-stock')
            const dEl = row.querySelector('.sku-days')
            if (st) {
                st.textContent = stocks[i].toLocaleString('ru-RU')
            }
            if (dEl) {
                const d = days[i]
                dEl.textContent = String(d)
                dEl.classList.remove(
                    'sku-days--safe',
                    'sku-days--warn',
                    'sku-days--crit',
                )
                if (d >= 120) {
                    dEl.classList.add('sku-days--safe')
                } else if (d >= 60) {
                    dEl.classList.add('sku-days--warn')
                } else {
                    dEl.classList.add('sku-days--crit')
                }
            }
        })
    }
})

function initWeeklyPnlBlock() {
    const canvas = document.getElementById('pnlWeekChart')
    if (!canvas || typeof Chart === 'undefined') return

    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const monthlyRev = 35000000
    const avgDaily = monthlyRev / 30
    const dayWeights = [0.92, 0.88, 0.95, 1.02, 1.15, 1.28, 1.1]

    let rng = 42
    function rand() {
        rng = (rng * 16807) % 2147483647
        return rng / 2147483647
    }

    const revenue = dayWeights.map((w) =>
        Math.round(avgDaily * w * (1 + (rand() - 0.5) * 0.25)),
    )

    const VAR_RATE = 0.65
    const FIXED_DAILY = Math.round(avgDaily * 0.14)
    const DEPR_DAILY = Math.round(avgDaily * 0.02)
    const TAX_RATE = 0.2

    const varCosts = revenue.map((r) => Math.round(r * VAR_RATE))
    const fixCosts = revenue.map(() => FIXED_DAILY)
    const deprCosts = revenue.map(() => DEPR_DAILY)
    const taxes = revenue.map((r, i) => {
        const pretax = r - varCosts[i] - fixCosts[i] - deprCosts[i]
        return Math.max(0, Math.round(pretax * TAX_RATE))
    })

    const sum = (arr) => arr.reduce((a, b) => a + b, 0)
    const tR = sum(revenue)
    const tV = sum(varCosts)
    const tF = sum(fixCosts)
    const tD = sum(deprCosts)
    const tT = sum(taxes)
    const tP = tR - tV - tF - tD - tT

    const breakevenMonthly =
        (FIXED_DAILY * 30 + DEPR_DAILY * 30) / (1 - VAR_RATE)
    const breakevenWeekly = breakevenMonthly / 4.3
    const safetyMargin = ((tR - breakevenWeekly) / tR) * 100

    const fmtM = (v) =>
        (v / 1000000).toFixed(1).replace('.', ',') + 'М ₽'

    const elRev = document.getElementById('pnl-m-revenue')
    const elRevSub = document.getElementById('pnl-m-revenue-sub')
    const elProfit = document.getElementById('pnl-m-profit')
    const elProfitSub = document.getElementById('pnl-m-profit-sub')
    const elBe = document.getElementById('pnl-m-breakeven')
    const elSafe = document.getElementById('pnl-m-safety')

    if (elRev) elRev.textContent = fmtM(tR)
    if (elRevSub) elRevSub.textContent = '+14,2% vs план'
    if (elProfit) elProfit.textContent = fmtM(tP)
    if (elProfitSub) {
        elProfitSub.textContent = Math.round((tP / tR) * 100) + '% от выручки'
        elProfitSub.classList.add('pnl-metric-sub--pos')
    }
    if (elBe) elBe.textContent = fmtM(breakevenWeekly) + '/нед'
    if (elSafe) elSafe.textContent = 'запас ' + Math.round(safetyMargin) + '%'

    const gridColor = 'rgba(28, 36, 51, 0.08)'
    const tickColor = '#5f6f86'

    const barDs = {
        borderRadius: 4,
        barPercentage: 0.72,
    }

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Выручка',
                    data: revenue,
                    backgroundColor: '#34d399',
                    ...barDs,
                },
                {
                    label: 'Переменные',
                    data: varCosts.map((v) => -v),
                    backgroundColor: '#f87171',
                    ...barDs,
                },
                {
                    label: 'Постоянные',
                    data: fixCosts.map((v) => -v),
                    backgroundColor: '#fbbf24',
                    ...barDs,
                },
                {
                    label: 'Амортизация',
                    data: deprCosts.map((v) => -v),
                    backgroundColor: '#94a3b8',
                    ...barDs,
                },
                {
                    label: 'Налоги',
                    data: taxes.map((v) => -v),
                    backgroundColor: '#a78bfa',
                    ...barDs,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e7f0',
                    borderWidth: 1,
                    titleFont: {
                        family: "'DM Sans', sans-serif",
                        size: 13,
                        weight: '600',
                    },
                    bodyFont: {
                        family: "'JetBrains Mono', monospace",
                        size: 12,
                    },
                    titleColor: '#1c2433',
                    bodyColor: '#5f6f86',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4,
                    callbacks: {
                        label: (ctx) => {
                            const v = Math.abs(ctx.raw)
                            return (
                                ' ' +
                                ctx.dataset.label +
                                ': ' +
                                (v / 1000).toFixed(0) +
                                'К ₽'
                            )
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: tickColor,
                        font: {
                            family: "'DM Sans', sans-serif",
                            size: 12,
                            weight: '500',
                        },
                    },
                },
                y: {
                    grid: { color: gridColor },
                    border: { display: false },
                    ticks: {
                        color: tickColor,
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 11,
                        },
                        callback: (v) => {
                            const abs = Math.abs(v)
                            const label =
                                abs >= 1000000
                                    ? (abs / 1000000).toFixed(1) + 'М'
                                    : (abs / 1000).toFixed(0) + 'К'
                            return (v < 0 ? '−' : '') + label
                        },
                    },
                },
            },
        },
    })

    document.querySelectorAll('.pnl-period-tabs .pnl-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document
                .querySelectorAll('.pnl-period-tabs .pnl-tab')
                .forEach((t) => t.classList.remove('active'))
            tab.classList.add('active')
        })
    })
}

document.addEventListener('DOMContentLoaded', initWeeklyPnlBlock)
