export async function logError(error: unknown) {
    let errorData: {
      message: string;
      stack?: string;
      details?: string;
      url: string;
      userAgent: string;
    } = {
      message: 'Unknown error',
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  
    if (error instanceof Error) {
      errorData.message = error.message;
      errorData.stack = error.stack;
      errorData.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
    } else if (typeof error === 'string') {
      errorData.message = error;
    } else {
      errorData.details = JSON.stringify(error);
    }
  
    try {
      const response = await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('Failed to log error:', fetchError);
    }
  }