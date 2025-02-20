import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { endRegistration } from '@/utils/adminActions'

export default adminHandlerWrapper('endRegistration', endRegistration)