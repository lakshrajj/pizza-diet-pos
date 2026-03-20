import { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)
  const timer = useState(null)

  const show = useCallback((message) => {
    setMsg(message)
    setVisible(true)
    if (timer[0]) clearTimeout(timer[0])
    timer[0] = setTimeout(() => setVisible(false), 2500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${visible ? 'show' : ''}`}>{msg}</div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
