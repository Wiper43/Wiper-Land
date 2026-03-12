export function createUI() {
  const root = document.createElement('div')
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.pointerEvents = 'none'
  root.style.zIndex = '1000'
  document.body.appendChild(root)

  // ============================================================
  // CROSSHAIR
  // ============================================================
  const crosshair = document.createElement('div')
  crosshair.style.position = 'absolute'
  crosshair.style.left = '50%'
  crosshair.style.top = '50%'
  crosshair.style.transform = 'translate(-50%, -50%)'
  crosshair.style.width = '14px'
  crosshair.style.height = '14px'
  crosshair.style.display = 'flex'
  crosshair.style.alignItems = 'center'
  crosshair.style.justifyContent = 'center'
  crosshair.style.color = 'white'
  crosshair.style.fontSize = '18px'
  crosshair.style.fontFamily = 'monospace'
  crosshair.style.textShadow = '0 0 4px rgba(0,0,0,0.9)'
  crosshair.textContent = '+'
  root.appendChild(crosshair)

  // ============================================================
  // HINT TEXT
  // ============================================================
  const hint = document.createElement('div')
  hint.style.position = 'absolute'
  hint.style.left = '50%'
  hint.style.bottom = '24px'
  hint.style.transform = 'translateX(-50%)'
  hint.style.color = 'white'
  hint.style.fontFamily = 'sans-serif'
  hint.style.fontSize = '14px'
  hint.style.textShadow = '0 0 4px rgba(0,0,0,0.9)'
  root.appendChild(hint)

  // ============================================================
  // LEFT CLICK SLASH FOR DIRECT ATTACK
  // ============================================================
  const slash = document.createElement('div')
  slash.style.position = 'absolute'
  slash.style.left = '50%'
  slash.style.top = '50%'
  slash.style.width = '220px'
  slash.style.height = '220px'
  slash.style.marginLeft = '-110px'
  slash.style.marginTop = '-110px'
  slash.style.borderRadius = '50%'
  slash.style.border = '8px solid rgba(255,255,255,0.0)'
  slash.style.borderTopColor = 'rgba(255,255,255,0.85)'
  slash.style.borderRightColor = 'rgba(255,220,140,0.65)'
  slash.style.filter = 'blur(1px)'
  slash.style.opacity = '0'
  slash.style.transform = 'rotate(-60deg) scale(0.55)'
  slash.style.transition = 'none'
  root.appendChild(slash)

  // ============================================================
  // OPTIONS BUTTON
  // ============================================================
  const optionsButton = document.createElement('button')
  optionsButton.textContent = 'Options'
  styleButton(optionsButton)
  optionsButton.style.position = 'absolute'
  optionsButton.style.top = '16px'
  optionsButton.style.right = '16px'
  root.appendChild(optionsButton)

  const optionsPanel = document.createElement('div')
  stylePanel(optionsPanel)
  optionsPanel.style.position = 'absolute'
  optionsPanel.style.top = '58px'
  optionsPanel.style.right = '16px'
  optionsPanel.style.width = '280px'
  optionsPanel.style.display = 'none'
  root.appendChild(optionsPanel)

  const optionsTitle = document.createElement('div')
  optionsTitle.textContent = 'Audio Settings'
  optionsTitle.style.fontSize = '16px'
  optionsTitle.style.fontWeight = 'bold'
  optionsTitle.style.marginBottom = '12px'
  optionsPanel.appendChild(optionsTitle)

  const cowVolumeRow = document.createElement('div')
  cowVolumeRow.style.display = 'flex'
  cowVolumeRow.style.flexDirection = 'column'
  cowVolumeRow.style.gap = '8px'
  optionsPanel.appendChild(cowVolumeRow)

  const cowVolumeLabel = document.createElement('label')
  cowVolumeLabel.textContent = 'Cow Volume'
  cowVolumeLabel.style.fontSize = '13px'
  cowVolumeRow.appendChild(cowVolumeLabel)

  const cowVolumeValue = document.createElement('div')
  cowVolumeValue.style.fontSize = '12px'
  cowVolumeValue.style.opacity = '0.85'
  cowVolumeRow.appendChild(cowVolumeValue)

  const cowVolumeSlider = document.createElement('input')
  cowVolumeSlider.type = 'range'
  cowVolumeSlider.min = '0'
  cowVolumeSlider.max = '1'
  cowVolumeSlider.step = '0.01'
  cowVolumeSlider.value = '0.8'
  cowVolumeSlider.style.width = '100%'
  cowVolumeSlider.style.cursor = 'pointer'
  cowVolumeRow.appendChild(cowVolumeSlider)

  // ============================================================
  // SPELLBOOK BUTTON
  // ============================================================
  const spellbookButton = document.createElement('button')
  spellbookButton.textContent = 'Spellbook'
  styleButton(spellbookButton)
  spellbookButton.style.position = 'absolute'
  spellbookButton.style.top = '16px'
  spellbookButton.style.right = '106px'
  root.appendChild(spellbookButton)

  const spellbookPanel = document.createElement('div')
  stylePanel(spellbookPanel)
  spellbookPanel.style.position = 'absolute'
  spellbookPanel.style.top = '58px'
  spellbookPanel.style.right = '106px'
  spellbookPanel.style.width = '280px'
  spellbookPanel.style.display = 'none'
  root.appendChild(spellbookPanel)

  const spellbookTitle = document.createElement('div')
  spellbookTitle.textContent = 'Right Click Attack'
  spellbookTitle.style.fontSize = '16px'
  spellbookTitle.style.fontWeight = 'bold'
  spellbookTitle.style.marginBottom = '10px'
  spellbookPanel.appendChild(spellbookTitle)

  const spellbookInfo = document.createElement('div')
  spellbookInfo.textContent = 'Choose which attack is on right click.'
  spellbookInfo.style.fontSize = '12px'
  spellbookInfo.style.opacity = '0.85'
  spellbookInfo.style.marginBottom = '12px'
  spellbookPanel.appendChild(spellbookInfo)

  const attackList = document.createElement('div')
  attackList.style.display = 'flex'
  attackList.style.flexDirection = 'column'
  attackList.style.gap = '8px'
  spellbookPanel.appendChild(attackList)

  let optionsOpen = false
  let spellbookOpen = false

  optionsButton.addEventListener('click', () => {
    optionsOpen = !optionsOpen
    optionsPanel.style.display = optionsOpen ? 'block' : 'none'
  })

  spellbookButton.addEventListener('click', () => {
    spellbookOpen = !spellbookOpen
    spellbookPanel.style.display = spellbookOpen ? 'block' : 'none'
  })

  function playAttackSlash() {
    slash.style.transition = 'none'
    slash.style.opacity = '0.95'
    slash.style.transform = 'rotate(-75deg) scale(0.45)'
    void slash.offsetWidth

    requestAnimationFrame(() => {
      slash.style.transition = 'transform 130ms ease-out, opacity 160ms ease-out'
      slash.style.opacity = '0'
      slash.style.transform = 'rotate(25deg) scale(1.05)'
    })
  }

  function setCowVolume(value) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0))
    cowVolumeSlider.value = String(clamped)
    cowVolumeValue.textContent = `${Math.round(clamped * 100)}%`
  }

  function setSpellbookAttacks(attacks, selectedId, onSelect) {
    attackList.innerHTML = ''

    for (const attack of attacks) {
      const button = document.createElement('button')
      button.textContent = `${attack.name} — ${attack.damage} dmg — ${attack.range} range`
      button.style.pointerEvents = 'auto'
      button.style.cursor = 'pointer'
      button.style.textAlign = 'left'
      button.style.padding = '10px'
      button.style.borderRadius = '10px'
      button.style.border = '1px solid rgba(255,255,255,0.18)'
      button.style.background =
        attack.id === selectedId ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)'
      button.style.color = attack.color || '#ffffff'
      button.style.fontSize = '13px'

      button.addEventListener('click', () => {
        onSelect(attack.id)
      })

      attackList.appendChild(button)
    }
  }

  return {
    root,
    crosshair,
    hint,
    optionsButton,
    optionsPanel,
    cowVolumeSlider,
    spellbookButton,
    spellbookPanel,

    setHint(text) {
      hint.textContent = text
    },

    playAttackSlash,

    setCowVolume,

    onCowVolumeChange(callback) {
      cowVolumeSlider.addEventListener('input', () => {
        const value = Number(cowVolumeSlider.value)
        setCowVolume(value)
        callback(value)
      })
    },

    setSpellbookAttacks,

    remove() {
      root.remove()
    },
  }
}

function styleButton(button) {
  button.style.pointerEvents = 'auto'
  button.style.padding = '10px 14px'
  button.style.border = '1px solid rgba(255,255,255,0.25)'
  button.style.borderRadius = '10px'
  button.style.background = 'rgba(0,0,0,0.65)'
  button.style.color = 'white'
  button.style.fontSize = '14px'
  button.style.cursor = 'pointer'
  button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
}

function stylePanel(panel) {
  panel.style.padding = '14px'
  panel.style.pointerEvents = 'auto'
  panel.style.border = '1px solid rgba(255,255,255,0.18)'
  panel.style.borderRadius = '12px'
  panel.style.background = 'rgba(0,0,0,0.82)'
  panel.style.color = 'white'
  panel.style.fontFamily = 'sans-serif'
  panel.style.boxShadow = '0 8px 18px rgba(0,0,0,0.35)'
}