import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

function Button({ children, variant = 'primary', ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button className={`btn ${variant}`} {...props}>
      {children}
    </button>
  )
}

export default Button
