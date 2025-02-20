import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { startRegistration } from '@/utils/adminActions'

export default adminHandlerWrapper('startRegistration', startRegistration)