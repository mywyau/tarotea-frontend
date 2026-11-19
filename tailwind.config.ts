// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'app-canvas': 'rgb(var(--color-canvas) / <alpha-value>)',
        'app-surface': 'rgb(var(--color-surface) / <alpha-value>)',
        'app-ink': 'rgb(var(--color-ink) / <alpha-value>)',
        'app-muted': 'rgb(var(--color-muted) / <alpha-value>)',
        'app-primary': 'rgb(var(--color-primary) / <alpha-value>)',
        'app-primary-strong': 'rgb(var(--color-primary-strong) / <alpha-value>)',
        'taro-pink': 'rgb(var(--color-taro-pink) / <alpha-value>)',
        'taro-lilac': 'rgb(var(--color-taro-lilac) / <alpha-value>)',
        'taro-blue': 'rgb(var(--color-taro-blue) / <alpha-value>)',
        'taro-blush': 'rgb(var(--color-taro-blush) / <alpha-value>)',
        'taro-yellow': 'rgb(var(--color-taro-yellow) / <alpha-value>)',
        'app-success': 'rgb(var(--color-success) / <alpha-value>)',
        'app-error': 'rgb(var(--color-error) / <alpha-value>)',
        'app-error-strong': 'rgb(var(--color-error-strong) / <alpha-value>)',
      },
      fontFamily: {
        brand: [
          'Manrope',
          'Noto Sans HK',
          'PingFang HK',
          'Microsoft JhengHei',
          'sans-serif',
        ],
        chinese: [
          'Noto Sans HK',
          'PingFang HK',
          'Microsoft JhengHei',
          'sans-serif',
        ],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        overlay: 'var(--shadow-overlay)',
      },
      maxWidth: {
        compact: 'var(--content-compact)',
        reading: 'var(--content-reading)',
        wide: 'var(--content-wide)',
      },
      spacing: {
        gutter: 'var(--page-gutter)',
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-2px)" },
          "40%": { transform: "translateX(2px)" },
          "60%": { transform: "translateX(-1px)" },
          "80%": { transform: "translateX(1px)" },
        },
      },
      fadeIn: {
        "0%": { opacity: "0" },
        "100%": { opacity: "1" },
      },
      animation: {
        shake: "shake 0.45s ease-out",
        fade: "fadeIn 0.6s ease-out",
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        panel: 'var(--motion-panel)',
        deliberate: 'var(--motion-deliberate)',
      },
    },
  },
};
