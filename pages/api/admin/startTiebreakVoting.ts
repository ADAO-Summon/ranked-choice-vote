import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { startTiebreakVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('startTiebreakVoting', startTiebreakVoting)