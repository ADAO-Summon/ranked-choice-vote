import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { endTiebreakVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('endTiebreakVoting', endTiebreakVoting)