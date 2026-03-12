export function createUI() {
  // ============================================================
  // ROOT UI LAYER
  // ------------------------------------------------------------
  // Fullscreen overlay used for:
  // - crosshair
  // - hint text
  // - direct attack slash
  // - lower-right spellbook
  // - spell beam / flare
  // - options panel
  // - spellbook selection panel
  // ============================================================
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
  hint.textContent = ''
  root.appendChild(hint)

  // ============================================================
  // LEFT CLICK DIRECT ATTACK SLASH
  // ------------------------------------------------------------
  // This keeps your existing direct attack visual in the center.
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
  // LOWER-RIGHT SPELLBOOK HELD ITEM
  // ------------------------------------------------------------
  // This acts like a held item in the player's right hand.
  // ============================================================
  const spellbookHolder = document.createElement('div')
  spellbookHolder.style.position = 'absolute'
  spellbookHolder.style.right = '28px'
  spellbookHolder.style.bottom = '30px'
  spellbookHolder.style.width = '220px'
  spellbookHolder.style.height = '180px'
  spellbookHolder.style.pointerEvents = 'none'
  spellbookHolder.style.overflow = 'visible'
  root.appendChild(spellbookHolder)

  const spellbookShadow = document.createElement('div')
  spellbookShadow.style.position = 'absolute'
  spellbookShadow.style.right = '6px'
  spellbookShadow.style.bottom = '4px'
  spellbookShadow.style.width = '132px'
  spellbookShadow.style.height = '92px'
  spellbookShadow.style.background = 'rgba(0,0,0,0.35)'
  spellbookShadow.style.borderRadius = '12px'
  spellbookShadow.style.filter = 'blur(12px)'
  spellbookShadow.style.transform = 'rotate(-18deg)'
  spellbookHolder.appendChild(spellbookShadow)

  const spellbook = document.createElement('div')
  spellbook.style.position = 'absolute'
  spellbook.style.right = '0'
  spellbook.style.bottom = '0'
  spellbook.style.width = '132px'
  spellbook.style.height = '92px'
  spellbook.style.borderRadius = '12px'
  spellbook.style.transform = 'translate(0px, 0px) rotate(-18deg) scale(1)'
  spellbook.style.transformOrigin = '85% 85%'
  spellbook.style.transition = 'none'
  spellbook.style.background =
    'linear-gradient(145deg, rgba(60,40,26,0.96), rgba(28,18,12,0.96))'
  spellbook.style.border = '2px solid rgba(180,140,100,0.45)'
  spellbook.style.boxShadow =
    '0 12px 30px rgba(0,0,0,0.45), inset 0 0 20px rgba(255,255,255,0.04)'
  spellbookHolder.appendChild(spellbook)

  const spellbookSpine = document.createElement('div')
  spellbookSpine.style.position = 'absolute'
  spellbookSpine.style.left = '10px'
  spellbookSpine.style.top = '4px'
  spellbookSpine.style.bottom = '4px'
  spellbookSpine.style.width = '12px'
  spellbookSpine.style.borderRadius = '8px'
  spellbookSpine.style.background =
    'linear-gradient(180deg, rgba(90,60,40,0.95), rgba(50,30,20,0.95))'
  spellbook.appendChild(spellbookSpine)

  const spellbookPages = document.createElement('div')
  spellbookPages.style.position = 'absolute'
  spellbookPages.style.left = '22px'
  spellbookPages.style.top = '8px'
  spellbookPages.style.right = '8px'
  spellbookPages.style.bottom = '8px'
  spellbookPages.style.borderRadius = '10px'
  spellbookPages.style.background =
    'linear-gradient(145deg, rgba(228,220,196,0.9), rgba(186,176,150,0.88))'
  spellbookPages.style.boxShadow = 'inset 0 0 12px rgba(0,0,0,0.12)'
  spellbook.appendChild(spellbookPages)

  const spellbookGlow = document.createElement('div')
  spellbookGlow.style.position = 'absolute'
  spellbookGlow.style.left = '28px'
  spellbookGlow.style.top = '16px'
  spellbookGlow.style.right = '18px'
  spellbookGlow.style.bottom = '16px'
  spellbookGlow.style.borderRadius = '8px'
  spellbookGlow.style.background =
    'radial-gradient(circle, rgba(255,80,50,0.0), rgba(255,80,50,0.0))'
  spellbookGlow.style.opacity = '0'
  spellbookGlow.style.filter = 'blur(6px)'
  spellbookGlow.style.transition = 'none'
  spellbook.appendChild(spellbookGlow)

  const spellbookRune = document.createElement('div')
  spellbookRune.style.position = 'absolute'
  spellbookRune.style.left = '56px'
  spellbookRune.style.top = '26px'
  spellbookRune.style.width = '30px'
  spellbookRune.style.height = '30px'
  spellbookRune.style.borderRadius = '50%'
  spellbookRune.style.border = '2px solid rgba(255,220,160,0.35)'
  spellbookRune.style.boxShadow = '0 0 8px rgba(255,220,160,0.12)'
  spellbookRune.style.background = 'rgba(255,255,255,0.03)'
  spellbookPages.appendChild(spellbookRune)

  // ============================================================
  // FULLSCREEN SPELL TRAIL
  // ------------------------------------------------------------
  // IMPORTANT:
  // This is attached to root, not the spellbook holder.
  // That way it can use full-screen coordinates and properly
  // point from the book to the center crosshair.
  // ============================================================
  const spellTrail = document.createElement('div')
  spellTrail.style.position = 'absolute'
  spellTrail.style.left = '0px'
  spellTrail.style.top = '0px'
  spellTrail.style.width = '0px'
  spellTrail.style.height = '34px'
  spellTrail.style.borderRadius = '24px'
  spellTrail.style.transform = 'rotate(0deg) scaleX(0)'
  spellTrail.style.transformOrigin = '100% 50%'
  spellTrail.style.opacity = '0'
  spellTrail.style.filter = 'blur(4px)'
  spellTrail.style.transition = 'none'
  spellTrail.style.pointerEvents = 'none'
  root.appendChild(spellTrail)

  // ============================================================
  // FULLSCREEN SPELL FLARE
  // ============================================================
  const spellFlare = document.createElement('div')
  spellFlare.style.position = 'absolute'
  spellFlare.style.left = '0px'
  spellFlare.style.top = '0px'
  spellFlare.style.width = '66px'
  spellFlare.style.height = '66px'
  spellFlare.style.borderRadius = '50%'
  spellFlare.style.opacity = '0'
  spellFlare.style.filter = 'blur(4px)'
  spellFlare.style.transform = 'scale(0.4)'
  spellFlare.style.transition = 'none'
  spellFlare.style.pointerEvents = 'none'
  root.appendChild(spellFlare)

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

  // ============================================================
  // DIRECT ATTACK VISUAL
  // ============================================================
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

  // ============================================================
  // SPELLBOOK CAST VISUAL
  // ------------------------------------------------------------
  // Fixes the beam so it points from the little book to the
  // center of the screen.
  // ============================================================
  function playSpellbookCast(attack) {
    const attackId = attack?.id || ''
    const attackName = attack?.name || ''

    let glowA = 'rgba(255,90,50,0.95)'
    let glowB = 'rgba(255,170,80,0.55)'
    let flare = 'rgba(255,110,60,0.95)'
    let trail =
      'linear-gradient(90deg, rgba(255,120,80,0.0), rgba(255,90,50,0.95), rgba(255,170,70,0.72))'

    const lowered = `${attackId} ${attackName}`.toLowerCase()

    if (lowered.includes('water')) {
      glowA = 'rgba(80,170,255,0.95)'
      glowB = 'rgba(110,240,255,0.55)'
      flare = 'rgba(90,180,255,0.98)'
      trail =
        'linear-gradient(90deg, rgba(80,170,255,0.0), rgba(70,160,255,0.96), rgba(140,255,255,0.74))'
    } else if (lowered.includes('flame')) {
      glowA = 'rgba(255,70,40,0.98)'
      glowB = 'rgba(255,170,70,0.60)'
      flare = 'rgba(255,90,40,0.98)'
      trail =
        'linear-gradient(90deg, rgba(255,100,50,0.0), rgba(255,70,40,0.97), rgba(255,180,70,0.78))'
    }

    // ----------------------------------------------------------
    // Book casting point on screen
    // These numbers are tuned to visually line up with the book.
    // ----------------------------------------------------------
    const bookX = window.innerWidth - 108
    const bookY = window.innerHeight - 92

    // ----------------------------------------------------------
    // Center of screen / crosshair
    // ----------------------------------------------------------
    const centerX = window.innerWidth * 0.5
    const centerY = window.innerHeight * 0.5

    const dx = centerX - bookX
    const dy = centerY - bookY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI)

    // ----------------------------------------------------------
    // Reset visuals
    // ----------------------------------------------------------
    spellbook.style.transition = 'none'
    spellbookGlow.style.transition = 'none'
    spellTrail.style.transition = 'none'
    spellFlare.style.transition = 'none'

    spellbook.style.transform = 'translate(0px, 0px) rotate(-18deg) scale(1)'
    spellbook.style.boxShadow =
      '0 12px 30px rgba(0,0,0,0.45), inset 0 0 20px rgba(255,255,255,0.04)'

    spellbookGlow.style.opacity = '0'
    spellbookGlow.style.background = `radial-gradient(circle, ${glowA}, ${glowB}, rgba(255,255,255,0.0))`

    // ----------------------------------------------------------
    // Beam setup
    // We place the right end of the beam at the book,
    // then rotate the full beam so it points to center screen.
    // ----------------------------------------------------------
    spellTrail.style.left = `${bookX - distance}px`
    spellTrail.style.top = `${bookY - 17}px`
    spellTrail.style.width = `${distance}px`
    spellTrail.style.height = '34px'
    spellTrail.style.background = trail
    spellTrail.style.opacity = '0.98'
    spellTrail.style.transformOrigin = '100% 50%'
    spellTrail.style.transform = `rotate(${angleDeg}deg) scaleX(0.08)`

    // ----------------------------------------------------------
    // Flare at the book
    // ----------------------------------------------------------
    spellFlare.style.left = `${bookX - 33}px`
    spellFlare.style.top = `${bookY - 33}px`
    spellFlare.style.background = `radial-gradient(circle, ${flare}, rgba(255,255,255,0.0) 70%)`
    spellFlare.style.opacity = '0.95'
    spellFlare.style.transform = 'scale(0.35)'

    void spellbook.offsetWidth

    requestAnimationFrame(() => {
      // Book lifts slightly like a right-hand cast
      spellbook.style.transition =
        'transform 150ms ease-out, box-shadow 150ms ease-out'
      spellbook.style.transform = 'translate(-26px, -18px) rotate(-8deg) scale(1.05)'
      spellbook.style.boxShadow =
        `0 14px 34px rgba(0,0,0,0.50), 0 0 18px ${glowA}, inset 0 0 20px rgba(255,255,255,0.05)`

      // Page glow blooms
      spellbookGlow.style.transition = 'opacity 140ms ease-out'
      spellbookGlow.style.opacity = '1'

      // Beam expands from the book toward center screen
      spellTrail.style.transition =
        'transform 120ms ease-out, opacity 180ms ease-out'
      spellTrail.style.transform = `rotate(${angleDeg}deg) scaleX(1)`
      spellTrail.style.opacity = '0'

      // Casting flare pops
      spellFlare.style.transition =
        'transform 120ms ease-out, opacity 170ms ease-out'
      spellFlare.style.transform = 'scale(1.15)'
      spellFlare.style.opacity = '0'
    })

    // Return book to idle
    setTimeout(() => {
      spellbook.style.transition =
        'transform 180ms ease-out, box-shadow 180ms ease-out'
      spellbook.style.transform = 'translate(0px, 0px) rotate(-18deg) scale(1)'
      spellbook.style.boxShadow =
        '0 12px 30px rgba(0,0,0,0.45), inset 0 0 20px rgba(255,255,255,0.04)'

      spellbookGlow.style.transition = 'opacity 180ms ease-out'
      spellbookGlow.style.opacity = '0'
    }, 120)
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
    playSpellbookCast,

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