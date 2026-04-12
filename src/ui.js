import { getSurfaceHeightExact } from './world/terrain.js'
import { getActiveWorldPreset } from './world/worldPresets.js'

export function createUI() {
  const MAP_WORLD_SIZE = getActiveWorldPreset().worldSize ?? 384
  const MAP_HALF_SIZE = MAP_WORLD_SIZE / 2

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

  const fireBombMeter = document.createElement('div')
  fireBombMeter.style.position = 'absolute'
  fireBombMeter.style.left = '50%'
  fireBombMeter.style.bottom = '52px'
  fireBombMeter.style.transform = 'translateX(-50%)'
  fireBombMeter.style.width = '220px'
  fireBombMeter.style.padding = '8px 10px'
  fireBombMeter.style.borderRadius = '12px'
  fireBombMeter.style.background = 'rgba(0,0,0,0.62)'
  fireBombMeter.style.border = '1px solid rgba(255,255,255,0.18)'
  fireBombMeter.style.opacity = '0'
  fireBombMeter.style.transition = 'opacity 120ms ease'
  root.appendChild(fireBombMeter)

  const fireBombLabel = document.createElement('div')
  fireBombLabel.style.color = 'white'
  fireBombLabel.style.fontFamily = 'sans-serif'
  fireBombLabel.style.fontSize = '12px'
  fireBombLabel.style.marginBottom = '6px'
  fireBombLabel.textContent = 'Fire Bomb Charging'
  fireBombMeter.appendChild(fireBombLabel)

  const fireBombBar = document.createElement('div')
  fireBombBar.style.height = '10px'
  fireBombBar.style.borderRadius = '999px'
  fireBombBar.style.background = 'rgba(255,255,255,0.12)'
  fireBombBar.style.overflow = 'hidden'
  fireBombMeter.appendChild(fireBombBar)

  const fireBombFill = document.createElement('div')
  fireBombFill.style.width = '0%'
  fireBombFill.style.height = '100%'
  fireBombFill.style.borderRadius = '999px'
  fireBombFill.style.background = 'linear-gradient(90deg, #ff8b3d, #ffd36b)'
  fireBombFill.style.boxShadow = '0 0 14px rgba(255,140,60,0.4)'
  fireBombFill.style.transition = 'width 40ms linear, background 120ms ease'
  fireBombBar.appendChild(fireBombFill)

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
spellbookHolder.style.display = 'none'
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

  // ============================================================
  // WORLD MAP
  // ------------------------------------------------------------
  // Toggle with M. Shows the 384x384 world with a player marker.
  // ============================================================
  const mapOverlay = document.createElement('div')
  mapOverlay.style.position = 'absolute'
  mapOverlay.style.left = '50%'
  mapOverlay.style.top = '50%'
  mapOverlay.style.transform = 'translate(-50%, -50%)'
  mapOverlay.style.width = 'min(78vw, 720px)'
  mapOverlay.style.height = 'min(78vw, 720px)'
  mapOverlay.style.maxHeight = '78vh'
  mapOverlay.style.display = 'none'
  mapOverlay.style.pointerEvents = 'none'
  mapOverlay.style.border = '3px solid rgba(255,255,255,0.26)'
  mapOverlay.style.borderRadius = '16px'
  mapOverlay.style.background = 'rgba(246,241,230,0.96)'
  mapOverlay.style.boxShadow = '0 20px 60px rgba(0,0,0,0.52)'
  mapOverlay.style.backdropFilter = 'blur(4px)'
  root.appendChild(mapOverlay)

  const mapTitle = document.createElement('div')
  mapTitle.textContent = 'World Map'
  mapTitle.style.position = 'absolute'
  mapTitle.style.left = '24px'
  mapTitle.style.top = '18px'
  mapTitle.style.fontFamily = 'sans-serif'
  mapTitle.style.fontSize = '24px'
  mapTitle.style.fontWeight = '800'
  mapTitle.style.letterSpacing = '0.5px'
  mapTitle.style.color = '#3d2c1e'
  mapOverlay.appendChild(mapTitle)

  const mapSubtitle = document.createElement('div')
  mapSubtitle.textContent = `${MAP_WORLD_SIZE} x ${MAP_WORLD_SIZE}`
  mapSubtitle.style.position = 'absolute'
  mapSubtitle.style.left = '24px'
  mapSubtitle.style.top = '50px'
  mapSubtitle.style.fontFamily = 'sans-serif'
  mapSubtitle.style.fontSize = '13px'
  mapSubtitle.style.opacity = '1'
  mapSubtitle.style.color = '#6a5743'
  mapOverlay.appendChild(mapSubtitle)

  const mapFrame = document.createElement('div')
  mapFrame.style.position = 'absolute'
  mapFrame.style.left = '64px'
  mapFrame.style.right = '34px'
  mapFrame.style.top = '86px'
  mapFrame.style.bottom = '58px'
  mapFrame.style.border = '2px solid rgba(92, 72, 51, 0.42)'
  mapFrame.style.borderRadius = '10px'
  mapFrame.style.background = 'linear-gradient(180deg, rgba(245,240,228,0.98), rgba(224,217,201,0.98))'
  mapFrame.style.overflow = 'hidden'
  mapOverlay.appendChild(mapFrame)

  const mapCanvas = document.createElement('canvas')
  mapCanvas.width = MAP_WORLD_SIZE
  mapCanvas.height = MAP_WORLD_SIZE
  mapCanvas.style.position = 'absolute'
  mapCanvas.style.inset = '0'
  mapCanvas.style.width = '100%'
  mapCanvas.style.height = '100%'
  mapCanvas.style.opacity = '0.96'
  mapCanvas.style.imageRendering = 'auto'
  mapFrame.appendChild(mapCanvas)

  const mapAxisX = document.createElement('div')
  mapAxisX.textContent = 'X'
  mapAxisX.style.position = 'absolute'
  mapAxisX.style.left = '50%'
  mapAxisX.style.bottom = '18px'
  mapAxisX.style.transform = 'translateX(-50%)'
  mapAxisX.style.fontFamily = 'sans-serif'
  mapAxisX.style.fontSize = '14px'
  mapAxisX.style.fontWeight = '700'
  mapAxisX.style.opacity = '1'
  mapAxisX.style.color = '#4b3726'
  mapOverlay.appendChild(mapAxisX)

  const mapAxisY = document.createElement('div')
  mapAxisY.textContent = 'Y'
  mapAxisY.style.position = 'absolute'
  mapAxisY.style.left = '20px'
  mapAxisY.style.top = '50%'
  mapAxisY.style.transform = 'translateY(-50%)'
  mapAxisY.style.fontFamily = 'sans-serif'
  mapAxisY.style.fontSize = '14px'
  mapAxisY.style.fontWeight = '700'
  mapAxisY.style.opacity = '1'
  mapAxisY.style.color = '#4b3726'
  mapOverlay.appendChild(mapAxisY)

  const axisTicks = [
    { value: 192, left: '0%', top: '0%' },
    { value: 96, left: '25%', top: '25%' },
    { value: 0, left: '50%', top: '50%' },
    { value: -96, left: '75%', top: '75%' },
    { value: -192, left: '100%', top: '100%' },
  ]

  for (const tick of axisTicks) {
    const xLabel = document.createElement('div')
    xLabel.textContent = String(tick.value)
    xLabel.style.position = 'absolute'
    xLabel.style.left = tick.left
    xLabel.style.bottom = '-28px'
    xLabel.style.transform = 'translateX(-50%)'
    xLabel.style.fontFamily = 'monospace'
    xLabel.style.fontSize = '12px'
    xLabel.style.opacity = '1'
    xLabel.style.color = '#654e38'
    xLabel.style.textShadow = '0 1px 0 rgba(255,255,255,0.65)'
    mapFrame.appendChild(xLabel)

    const yLabel = document.createElement('div')
    yLabel.textContent = String(tick.value)
    yLabel.style.position = 'absolute'
    yLabel.style.left = '-40px'
    yLabel.style.top = tick.top
    yLabel.style.transform = 'translateY(-50%)'
    yLabel.style.fontFamily = 'monospace'
    yLabel.style.fontSize = '12px'
    yLabel.style.opacity = '1'
    yLabel.style.color = '#654e38'
    yLabel.style.textShadow = '0 1px 0 rgba(255,255,255,0.65)'
    mapFrame.appendChild(yLabel)
  }

  const mapCrossVertical = document.createElement('div')
  mapCrossVertical.style.position = 'absolute'
  mapCrossVertical.style.left = '50%'
  mapCrossVertical.style.top = '0'
  mapCrossVertical.style.bottom = '0'
  mapCrossVertical.style.width = '1px'
  mapCrossVertical.style.background = 'rgba(82, 64, 46, 0.18)'
  mapFrame.appendChild(mapCrossVertical)

  const mapCrossHorizontal = document.createElement('div')
  mapCrossHorizontal.style.position = 'absolute'
  mapCrossHorizontal.style.top = '50%'
  mapCrossHorizontal.style.left = '0'
  mapCrossHorizontal.style.right = '0'
  mapCrossHorizontal.style.height = '1px'
  mapCrossHorizontal.style.background = 'rgba(82, 64, 46, 0.18)'
  mapFrame.appendChild(mapCrossHorizontal)

  const playerMarker = document.createElement('div')
  playerMarker.style.position = 'absolute'
  playerMarker.style.left = '50%'
  playerMarker.style.top = '50%'
  playerMarker.style.transform = 'translate(-50%, -50%) rotate(0deg)'
  playerMarker.style.transformOrigin = '50% 50%'
  playerMarker.style.width = '54px'
  playerMarker.style.height = '30px'
  playerMarker.style.filter = 'drop-shadow(0 0 10px rgba(255,40,40,0.48))'
  playerMarker.style.pointerEvents = 'none'

  const playerMarkerTail = document.createElement('div')
  playerMarkerTail.style.position = 'absolute'
  playerMarkerTail.style.left = '0'
  playerMarkerTail.style.top = '50%'
  playerMarkerTail.style.width = '30px'
  playerMarkerTail.style.height = '12px'
  playerMarkerTail.style.transform = 'translateY(-50%)'
  playerMarkerTail.style.background = '#ff3131'
  playerMarkerTail.style.borderRadius = '2px 0 0 2px'
  playerMarker.appendChild(playerMarkerTail)

  const playerMarkerHead = document.createElement('div')
  playerMarkerHead.style.position = 'absolute'
  playerMarkerHead.style.right = '0'
  playerMarkerHead.style.top = '50%'
  playerMarkerHead.style.width = '0'
  playerMarkerHead.style.height = '0'
  playerMarkerHead.style.transform = 'translateY(-50%)'
  playerMarkerHead.style.borderTop = '15px solid transparent'
  playerMarkerHead.style.borderBottom = '15px solid transparent'
  playerMarkerHead.style.borderLeft = '24px solid #ff3131'
  playerMarker.appendChild(playerMarkerHead)

  mapFrame.appendChild(playerMarker)

  const mapCoords = document.createElement('div')
  mapCoords.style.position = 'absolute'
  mapCoords.style.right = '24px'
  mapCoords.style.top = '22px'
  mapCoords.style.fontFamily = 'monospace'
  mapCoords.style.fontSize = '14px'
  mapCoords.style.opacity = '1'
  mapCoords.style.textAlign = 'right'
  mapCoords.style.color = '#4b3726'
  mapCoords.style.textShadow = '0 1px 0 rgba(255,255,255,0.68)'
  mapOverlay.appendChild(mapCoords)

  let optionsOpen = false
  let spellbookOpen = false
  let mapOpen = false

  drawTopographicMap(mapCanvas, MAP_WORLD_SIZE, MAP_HALF_SIZE)

  optionsButton.addEventListener('click', () => {
    optionsOpen = !optionsOpen
    optionsPanel.style.display = optionsOpen ? 'block' : 'none'
  })

  spellbookButton.addEventListener('click', () => {
    spellbookOpen = !spellbookOpen
    spellbookPanel.style.display = spellbookOpen ? 'block' : 'none'
  })

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return
    if (event.code !== 'KeyM') return

    mapOpen = !mapOpen
    mapOverlay.style.display = mapOpen ? 'block' : 'none'
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
  function getElementScreenPoint(element, xPercent = 0.5, yPercent = 0.5) {
    const rect = element.getBoundingClientRect()

    return {
      x: rect.left + rect.width * xPercent,
      y: rect.top + rect.height * yPercent,
    }
  }

  function getHeldItemCastAnchor() {
    // Slightly inside the visible page area so the beam feels like
    // it comes from the book instead of the outer border.
    return getElementScreenPoint(spellbook, 0.35, 0.35)
  }

  function getCrosshairAnchor() {
    return getElementScreenPoint(crosshair, 0.5, 0.5)
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

    spellbook.style.transition = 'none'
    spellbookGlow.style.transition = 'none'
    spellTrail.style.transition = 'none'
    spellFlare.style.transition = 'none'

    spellbook.style.transform = 'translate(0px, 0px) rotate(-18deg) scale(1)'
    spellbook.style.boxShadow =
      '0 12px 30px rgba(0,0,0,0.45), inset 0 0 20px rgba(255,255,255,0.04)'

    spellbookGlow.style.opacity = '0'
    spellbookGlow.style.background = `radial-gradient(circle, ${glowA}, ${glowB}, rgba(255,255,255,0.0))`

    // Force layout so anchor positions reflect the current real DOM state
    void spellbook.offsetWidth

    const bookAnchor = getHeldItemCastAnchor()
    const crosshairAnchor = getCrosshairAnchor()

    const dx = crosshairAnchor.x - bookAnchor.x
    const dy = crosshairAnchor.y - bookAnchor.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI)

    // Trail starts at the held item anchor and extends toward the crosshair
    spellTrail.style.left = `${bookAnchor.x - distance}px`
    spellTrail.style.top = `${bookAnchor.y - 17}px`
    spellTrail.style.width = `${distance}px`
    spellTrail.style.height = '34px'
    spellTrail.style.background = trail
    spellTrail.style.opacity = '0.98'
    spellTrail.style.transformOrigin = '100% 50%'
    spellTrail.style.transform = `rotate(${angleDeg}deg) scaleX(0.08)`

    // Flare at cast origin
    spellFlare.style.left = `${bookAnchor.x - 33}px`
    spellFlare.style.top = `${bookAnchor.y - 33}px`
    spellFlare.style.background = `radial-gradient(circle, ${flare}, rgba(255,255,255,0.0) 70%)`
    spellFlare.style.opacity = '0.95'
    spellFlare.style.transform = 'scale(0.35)'

    void spellbook.offsetWidth

    requestAnimationFrame(() => {
      spellbook.style.transition =
        'transform 150ms ease-out, box-shadow 150ms ease-out'
      spellbook.style.transform = 'translate(-26px, -18px) rotate(-8deg) scale(1.05)'
      spellbook.style.boxShadow =
        `0 14px 34px rgba(0,0,0,0.50), 0 0 18px ${glowA}, inset 0 0 20px rgba(255,255,255,0.05)`

      spellbookGlow.style.transition = 'opacity 140ms ease-out'
      spellbookGlow.style.opacity = '1'

      spellTrail.style.transition =
        'transform 120ms ease-out, opacity 180ms ease-out'
      spellTrail.style.transform = `rotate(${angleDeg}deg) scaleX(1)`
      spellTrail.style.opacity = '0'

      spellFlare.style.transition =
        'transform 120ms ease-out, opacity 170ms ease-out'
      spellFlare.style.transform = 'scale(1.15)'
      spellFlare.style.opacity = '0'
    })

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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  }

  function updateMapPlayerPosition(position, direction = null) {
    if (!position) return

    const normalizedX = clamp((position.x + MAP_HALF_SIZE) / MAP_WORLD_SIZE, 0, 1)
    const normalizedY = clamp((position.z + MAP_HALF_SIZE) / MAP_WORLD_SIZE, 0, 1)

    playerMarker.style.left = `${normalizedX * 100}%`
    playerMarker.style.top = `${normalizedY * 100}%`
    if (direction) {
      const angleDeg = Math.atan2(direction.z, direction.x) * (180 / Math.PI)
      playerMarker.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`
    }
    mapCoords.textContent = `X: ${position.x.toFixed(1)}\nY: ${(-position.z).toFixed(1)}\nZ: ${position.y.toFixed(1)}`
    mapCoords.style.whiteSpace = 'pre-line'
  }

  function setFireBombCharge(active, progress = 0, charged = false) {
    fireBombMeter.style.opacity = active ? '1' : '0'
    fireBombFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`
    fireBombFill.style.background = charged
      ? 'linear-gradient(90deg, #ffd36b, #fff4b2)'
      : 'linear-gradient(90deg, #ff8b3d, #ffd36b)'
    fireBombLabel.textContent = charged ? 'Fire Bomb Charged' : 'Fire Bomb Charging'
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
    setFireBombCharge,
    updateMapPlayerPosition,

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

function drawTopographicMap(canvas, worldSize, worldHalfSize) {
  const context = canvas.getContext('2d')
  if (!context) return

  const heights = []
  let minHeight = Infinity
  let maxHeight = -Infinity

  for (let y = 0; y < worldSize; y++) {
    const row = []
    const bz = y - worldHalfSize

    for (let x = 0; x < worldSize; x++) {
      const bx = x - worldHalfSize
      const height = getSurfaceHeightExact(bx, bz)
      row.push(height)
      minHeight = Math.min(minHeight, height)
      maxHeight = Math.max(maxHeight, height)
    }

    heights.push(row)
  }

  const image = context.createImageData(worldSize, worldSize)

  for (let y = 0; y < worldSize; y++) {
    for (let x = 0; x < worldSize; x++) {
      const height = heights[y][x]
      const normalized = (height - minHeight) / Math.max(1, maxHeight - minHeight)

      let red = 245
      let green = 240
      let blue = 230

      if (normalized < 0.16) {
        red = 184
        green = 215
        blue = 221
      } else if (normalized < 0.3) {
        red = 213
        green = 227
        blue = 194
      } else if (normalized < 0.58) {
        red = 232
        green = 226
        blue = 210
      } else {
        red = 222 - normalized * 32
        green = 214 - normalized * 36
        blue = 206 - normalized * 38
      }

      const left = x > 0 ? heights[y][x - 1] : height
      const right = x < worldSize - 1 ? heights[y][x + 1] : height
      const up = y > 0 ? heights[y - 1][x] : height
      const down = y < worldSize - 1 ? heights[y + 1][x] : height
      const slope = Math.abs(right - left) + Math.abs(down - up)

      const shade = slope * 8
      red = Math.max(0, red - shade)
      green = Math.max(0, green - shade)
      blue = Math.max(0, blue - shade)

      const index = (y * worldSize + x) * 4
      image.data[index] = red
      image.data[index + 1] = green
      image.data[index + 2] = blue
      image.data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)

  drawContourSet(context, heights, worldSize, minHeight, maxHeight, 0.8, 'rgba(118, 91, 70, 0.55)', 0.75)
  drawContourSet(context, heights, worldSize, minHeight, maxHeight, 3.2, 'rgba(92, 68, 50, 0.78)', 1.25)
  drawContourLabels(context, heights, worldSize, minHeight, maxHeight, 6.4)

  context.save()
  context.strokeStyle = 'rgba(120, 98, 78, 0.35)'
  context.lineWidth = 0.6
  const gridStep = worldSize / 4
  for (let offset = gridStep; offset < worldSize; offset += gridStep) {
    context.beginPath()
    context.moveTo(offset + 0.5, 0)
    context.lineTo(offset + 0.5, worldSize)
    context.stroke()

    context.beginPath()
    context.moveTo(0, offset + 0.5)
    context.lineTo(worldSize, offset + 0.5)
    context.stroke()
  }
  context.restore()
}

function drawContourSet(context, heights, size, minHeight, maxHeight, step, strokeStyle, lineWidth) {
  context.save()
  context.strokeStyle = strokeStyle
  context.lineWidth = lineWidth
  context.lineJoin = 'round'
  context.lineCap = 'round'

  const startLevel = Math.ceil(minHeight / step) * step
  for (let level = startLevel; level <= maxHeight; level += step) {
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        traceContourCell(context, heights, x, y, level)
      }
    }
  }

  context.restore()
}

function traceContourCell(context, heights, x, y, level) {
  const tl = heights[y][x]
  const tr = heights[y][x + 1]
  const br = heights[y + 1][x + 1]
  const bl = heights[y + 1][x]

  const points = []

  addContourPoint(points, level, tl, tr, x, y, x + 1, y)
  addContourPoint(points, level, tr, br, x + 1, y, x + 1, y + 1)
  addContourPoint(points, level, br, bl, x + 1, y + 1, x, y + 1)
  addContourPoint(points, level, bl, tl, x, y + 1, x, y)

  if (points.length < 2) return

  if (points.length === 2) {
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    context.lineTo(points[1].x, points[1].y)
    context.stroke()
    return
  }

  if (points.length === 4) {
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    context.lineTo(points[1].x, points[1].y)
    context.stroke()

    context.beginPath()
    context.moveTo(points[2].x, points[2].y)
    context.lineTo(points[3].x, points[3].y)
    context.stroke()
  }
}

function addContourPoint(points, level, a, b, ax, ay, bx, by) {
  const aAbove = a >= level
  const bAbove = b >= level
  if (aAbove === bAbove || a === b) return

  const t = (level - a) / (b - a)
  points.push({
    x: ax + (bx - ax) * t,
    y: ay + (by - ay) * t,
  })
}

function drawContourLabels(context, heights, size, minHeight, maxHeight, step) {
  context.save()
  context.fillStyle = 'rgba(110, 84, 62, 0.9)'
  context.font = '10px monospace'

  const columns = [24, 72, 120, 160]
  const rows = [28, 78, 128, 168]

  for (const y of rows) {
    for (const x of columns) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      const height = heights[y][x]
      const snapped = Math.round(height / step) * step
      if (snapped < minHeight || snapped > maxHeight) continue
      context.fillText(String(Math.round(snapped * 100)), x + 2, y - 2)
    }
  }

  context.restore()
}
