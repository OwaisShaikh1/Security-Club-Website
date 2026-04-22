import DecodeText from '../effects/DecodeText'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <header className="section-header">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2><DecodeText text={title} /></h2>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </header>
  )
}

export default SectionHeader
