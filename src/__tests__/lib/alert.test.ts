/**
 * sendAlert 테스트
 * - account.alertsEnabled로 Google Chat 발송 여부를 게이트한다
 * - AlertLog 기록은 alertsEnabled와 무관하게 항상 남긴다 (발송 이력 추적용)
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    alertLog: {
      create: jest.fn(),
    },
  },
}))

import { sendAlert } from '@/lib/alert'
import { prisma } from '@/lib/prisma'

const mockCreate = prisma.alertLog.create as jest.Mock

const account = { id: 'acc-1', name: '테스트계정', alertsEnabled: true }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_CHAT_WEBHOOK_URL = 'https://chat.googleapis.com/webhook/test'
  global.fetch = jest.fn().mockResolvedValue({ ok: true })
})

afterEach(() => {
  delete process.env.GOOGLE_CHAT_WEBHOOK_URL
})

describe('sendAlert', () => {
  it('alertsEnabled가 true면 Google Chat 발송 + AlertLog 기록을 모두 수행해야 한다', async () => {
    mockCreate.mockResolvedValue({})

    await sendAlert(account, 'EXCEED_5H', '5시간 윈도우 사용량 95%')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: 'acc-1', alertType: 'EXCEED_5H' }),
    })
  })

  it('alertsEnabled가 false면 Google Chat 발송은 건너뛰고 AlertLog는 그대로 기록해야 한다', async () => {
    mockCreate.mockResolvedValue({})

    await sendAlert({ ...account, alertsEnabled: false }, 'EXCEED_5H', '5시간 윈도우 사용량 95%')

    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: 'acc-1', alertType: 'EXCEED_5H' }),
    })
  })

  it('alertsEnabled가 true인데 Google Chat 발송이 실패하면 예외를 던지고 AlertLog는 기록하지 않아야 한다', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })

    await expect(sendAlert(account, 'FETCH_ERROR', '네트워크 오류')).rejects.toThrow()

    expect(mockCreate).not.toHaveBeenCalled()
  })
})
