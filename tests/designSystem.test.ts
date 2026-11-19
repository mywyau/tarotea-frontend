import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('design system foundation', () => {
  it('defines the approved semantic palette and layout tokens', () => {
    const theme = read('assets/css/theme.css')

    expect(theme).toContain('--color-canvas: 255 250 251')
    expect(theme).toContain('--color-primary: 135 85 141')
    expect(theme).toContain('--color-taro-pink: 234 184 228')
    expect(theme).toContain('--color-taro-blue: 168 202 224')
    expect(theme).toContain('--color-success: 120 162 118')
    expect(theme).toContain('--page-gutter:')
    expect(theme).toContain('--focus-ring:')
    expect(theme).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('keeps the font prototype opt-in through semantic font tokens', () => {
    const config = read('nuxt.config.ts')
    const theme = read('assets/css/theme.css')
    const tailwind = read('tailwind.config.ts')

    expect(config).toContain('"@nuxt/fonts"')
    expect(config).toContain('name: "Manrope"')
    expect(config).toContain('processCSSVariables: false')
    expect(theme).toContain("--font-chinese: 'Noto Sans HK'")
    expect(tailwind).toContain("fontFamily: {")
    expect(tailwind).toContain("brand: [")
    expect(tailwind).toContain("chinese: [")
  })

  it('provides accessible button and status contracts', () => {
    const button = read('components/ui/AppButton.vue')
    const iconButton = read('components/ui/AppIconButton.vue')
    const status = read('components/ui/AppStatusState.vue')

    expect(button).toContain(':aria-disabled=')
    expect(button).toContain(':aria-busy=')
    expect(button).toContain('min-height: 2.75rem')
    expect(iconButton).toContain('label: string')
    expect(iconButton).toContain(':aria-label="props.label"')
    expect(status).toContain("props.tone === 'error' ? 'alert' : 'status'")
    expect(status).toContain("'assertive' : 'polite'")
  })

  it('keeps the visual reference out of the public page tree', () => {
    const preview = read('components/ui/AppDesignSystemPreview.vue')

    expect(preview).toContain('TaroTea design foundation')
    expect(preview).toContain('<AppStatusState')
    expect(preview).toContain('class="app-form-control"')
  })
})
