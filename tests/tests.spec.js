const { test, expect } = require('@playwright/test')
const fs = require('fs')
const getSubtitleId = async ({ page, containerIndex = 0, subtitleIndex = 0 }) => {
  const subtitle = await page
    .getByTestId(`subtitle_container_${containerIndex}`)
    .getByTestId(`subtitle_input_${subtitleIndex}`)
  return (await subtitle.getAttribute('id')).split('_')[1]
}

const fixWaveform = async ({ page }) => {
  // Set the value and dispatch the 'input' event to mimic user interaction
  await page.getByTestId('time-zoom').evaluate(node => {
    node.value = 30 // Change value to 30
    node.dispatchEvent(new Event('input', { bubbles: true })) // Dispatch 'input' event
    node.dispatchEvent(new Event('change', { bubbles: true })) // Dispatch 'change' event
  })
  await page.waitForTimeout(1000) // Wait for the application to process the change

  // Set the value and dispatch the 'input' event to mimic user interaction
  await page.getByTestId('time-zoom').evaluate(node => {
    node.value = 74 // Change value to 74
    node.dispatchEvent(new Event('input', { bubbles: true })) // Dispatch 'input' event
    node.dispatchEvent(new Event('change', { bubbles: true })) // Dispatch 'change' event
  })
}
test('Open application', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await expect(page).toHaveTitle(/Subtitle Sync Editor/)
  await page.waitForTimeout(500)
})

test('Open videos', async ({ page }) => {
  if (fs.existsSync('backend/session.json')) {
    fs.rmSync('backend/session.json', { force: true })
  }
  await page.goto('http://localhost:8081/')

  await page.getByTestId('video_player_0').hover()
  await page.getByTestId('video_player_0_action_mdi-file-plus').click()
  await page.getByTestId('file_manager_file_example1.mkv').click()
  const video1 = page.getByTestId('video_player_0').getByTestId('player')
  await expect(video1).toBeVisible()

  await expect(page.getByTestId('waveform_loading_0')).toBeHidden()

  await page.getByTestId('video_player_1').hover()
  await page.getByTestId('video_player_1_action_mdi-file-plus').click()
  await page.getByTestId('file_manager_file_example1_extended.mkv').click()
  const video2 = page.getByTestId('video_player_1').getByTestId('player')
  await expect(video2).toBeVisible()

  await expect(page.getByTestId('waveform_loading_1')).toBeHidden()
})

test('Open subtitles', async ({ page }) => {
  await page.goto('http://localhost:8081/test/')
  await page.getByTestId('subtitle_container_0').hover()
  await page.getByTestId('subtitle_container_0_action_mdi-file-plus').click()
  await page.getByTestId('file_manager_file_subs.srt').click()
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_0')).toBeVisible()
  await page.waitForTimeout(500)
})

test('Modify subtitle', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  const subtitle = await page.getByTestId('subtitle_container_0').getByTestId('subtitle_input_0')
  await subtitle.fill('Hello World!')
  const id = (await subtitle.getAttribute('id')).split('_')[1]
  // check if subtitle is modified in the waveform
  await expect(await page.getByTestId(`subtitle_${id}`).textContent()).toBe('Hello World!')
})

test('Close subtitles', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await page.getByTestId('subtitle_container_0').hover()
  await page.getByTestId('subtitle_container_0_action_mdi-close').click()
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_0')).toBeHidden()
  await page.waitForTimeout(500)
})

test('Detect speeches', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await [0, 1].reduce(async (promise, i) => {
    await promise
    await page.getByTestId(`waveform_${i}`).click()
    await page.getByTestId(`waveMenu_button_${i}_Detect subtitles`).click()
    await expect(page.getByTestId(`subtitle_container_${i}_subtitle_row_0`)).toBeVisible()
    await expect(page.getByTestId(`subtitle_container_${i}_subtitle_row_1`)).toBeVisible()
    await expect(page.getByTestId(`subtitle_container_${i}_subtitle_row_2`)).toBeVisible()
  }, Promise.resolve())
})

test('Align subtitles', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await fixWaveform({ page })
  const id = await getSubtitleId({ page, subtitleIndex: 3 })
  await page.getByTestId(`subtitle_${id}`).click()
  await page.getByTestId(`regionMenu_button_0_Align subtitle`).click({})
  await expect(page.getByTestId('loader_spinner')).toBeHidden()
  await page.waitForTimeout(500)
  // check if wrapper has left margin
  let wrapper = await page.getByTestId('waveform_0').locator('.wrapper')
  // check if wrapper has no left margin
  const margin = await wrapper.evaluate(node => node.style.marginLeft)
  if (margin === '0px') {
    wrapper = await page.getByTestId('waveform_1').locator('.wrapper')
    await expect(await wrapper.evaluate(node => node.style.marginLeft)).not.toBe('0px')
  }
  // check if subtitles are aligned
  const subtitleAligned = page
    .getByTestId('subtitle_container_0_subtitle_row_1')
    .getByTestId('aligned_1')
  await expect(subtitleAligned).toBeVisible()
})

test('Clear alignment', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await fixWaveform({ page })
  const id = await getSubtitleId({ page })
  await page.getByTestId(`subtitle_${id}`).click()
  await page.getByTestId(`regionMenu_button_0_Clear alignment`).click()
  let wrapper = await page.getByTestId('waveform_0').locator('.wrapper')
  // check if wrapper has no left margin
  const margin = await wrapper.evaluate(node => node.style.marginLeft)
  if (margin === '0px') {
    wrapper = await page.getByTestId('waveform_1').locator('.wrapper')
    await expect(await wrapper.evaluate(node => node.style.marginLeft)).toBe('0px')
  } else {
    throw new Error('Alignment not cleared')
  }
  // check if subtitles are not aligned
  await expect(
    page.getByTestId('subtitle_container_0_subtitle_row_0').getByTestId('aligned_0'),
  ).toBeHidden()
})

test('Concurrent editing', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await page.waitForTimeout(3000)
})

test('Concurrent timing', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await page.waitForTimeout(3000)
})

test('Embed subtitles', async ({ page }) => {
  await page.goto('http://localhost:8081/test/')
  await page.waitForTimeout(3000)
  await page.getByTestId('video_player_0').hover()
  await page.getByTestId('video_player_0_action_mdi-content-save-plus').click()
  await expect(page.getByTestId('error_box')).toBeHidden()
})

test('Export subtitles', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await page.waitForTimeout(3000)
  await page.getByTestId('subtitle_container_0').hover()
  await page.getByTestId('subtitle_container_0_action_mdi-close').click()
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_0')).toBeHidden()
  await page.getByTestId('subtitle_container_0_action_mdi-export').click()
  await expect(page.getByTestId('error_box')).toBeHidden()
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_0')).toBeVisible()
})

test('Keyboard shortcuts', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await fixWaveform({ page })

  // test moving subtitles with arrow keys
  await page.getByTestId('subtitle_container_0_subtitle_row_0').click()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_1')).toHaveClass(
    /table_row_active/,
  )

  // test moving to playback position with q
  await page.keyboard.press('q')
  const video = page.getByTestId('video_player_0').getByTestId('player')
  const currentTime = await video.evaluate(video => video.currentTime)
  await expect(currentTime).toBeGreaterThan(0)

  // test adding new subtitle
  await page.keyboard.press('ArrowUp')
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_0')).toHaveClass(
    /table_row_active/,
  )

  await page.keyboard.press('Insert')
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByTestId('subtitle_container_0_subtitle_row_1').getByTestId('subtitle_input_1'),
  ).toContainText('New')

  // test deleting subtitle
  await page
    .getByTestId('subtitle_container_0_subtitle_row_1')
    .getByTestId('delete_subtitle')
    .click()
  await expect(page.getByTestId('subtitle_container_0_subtitle_row_1')).not.toHaveClass(
    /table_row_active/,
  )

  // test splitting subtitle
  await page
    .getByTestId('subtitle_container_0_subtitle_row_1')
    .getByTestId('subtitle_input_1')
    .fill('Split this')
  await page
    .getByTestId('subtitle_container_0_subtitle_row_1')
    .getByTestId('split_subtitle')
    .click()
  await expect(
    page.getByTestId('subtitle_container_0_subtitle_row_1').getByTestId('subtitle_input_1'),
  ).toContainText('Split')

  // test adding italic formatting
  await page.keyboard.press('i')
  await expect(
    page.getByTestId('subtitle_container_0_subtitle_row_1').getByTestId('subtitle_input_1'),
  ).toContainText('<i>Split</i>')
  await page.keyboard.press('i')
  await expect(
    page.getByTestId('subtitle_container_0_subtitle_row_1').getByTestId('subtitle_input_1'),
  ).toContainText('Split')

  // test creating conversation
  await page.keyboard.press('o')
  await expect(
    page.getByTestId('subtitle_container_0_subtitle_row_1').getByTestId('subtitle_input_1'),
  ).toContainText('- Split')
})
