/** Check actual text geometry as well as CSS sizes; table cells may fit while words do not. */
export async function checkDensity(page, errors, name) {
  const density = await page.evaluate(() => {
    const visible = el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
    const typography = el => ({ text: (el.placeholder || el.textContent).trim().slice(0, 70), size: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight })
    const controls = [...document.querySelectorAll('main input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), main textarea, main [role="combobox"]')].filter(visible).map(typography)
    const titles = [...document.querySelectorAll('main :is(.card, .glass-card, .platform-surface, .empty-state) :is(h2, h3)')].filter(visible).map(typography)
    const splitWords = []
    const tables = [...document.querySelectorAll('main .platform-table')].filter(visible).map(table => {
      const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (!visible(node.parentElement) || node.parentElement.closest('.whitespace-normal, .break-all, .break-words')) continue
        for (const match of node.textContent.matchAll(/[A-Za-z0-9]{5,}/g)) {
          const range = document.createRange()
          range.setStart(node, match.index)
          range.setEnd(node, match.index + match[0].length)
          const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.y)))
          if (lines.size > 1) splitWords.push(match[0])
        }
      }
      let scroller = table.parentElement
      while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowX)) scroller = scroller.parentElement
      const previousScroll = scroller?.scrollLeft
      if (scroller) scroller.scrollLeft = scroller.scrollWidth
      const reachable = !scroller || scroller.scrollWidth <= scroller.clientWidth + 1 || scroller.scrollLeft > 0
      if (scroller) scroller.scrollLeft = previousScroll
      return { width: table.getBoundingClientRect().width, scrollWidth: scroller?.scrollWidth, viewport: scroller?.clientWidth, contained: !!scroller && scroller.clientWidth <= innerWidth, reachable }
    })
    return { controls, titles, splitWords, tables, viewportWidth: innerWidth }
  })
  if (density.controls.some(control => control.size !== '14px' || control.line !== '20px')) errors.push('Form control typography differs from the shared 14px scale')
  if (density.titles.some(title => title.size !== '14px' || title.line !== '20px')) errors.push('Card title typography differs from the shared 14px scale')
  if (density.splitWords.length) errors.push('Table words split across lines: ' + density.splitWords.join(', '))
  if (density.tables.some(table => !table.reachable || !table.contained && table.width > density.viewportWidth)) errors.push('Wide table cannot be scrolled within the viewport')
  console.log(JSON.stringify({ name, density }))
}
