import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { resetTiebreakVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('resetTiebreakVoting', resetTiebreakVoting)