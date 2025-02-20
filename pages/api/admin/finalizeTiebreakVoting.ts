import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { finalizeTiebreakVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('finalizeTiebreakVoting', finalizeTiebreakVoting)