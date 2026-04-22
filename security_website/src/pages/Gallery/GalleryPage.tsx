import SectionHeader from '../../components/common/SectionHeader'
import { gallery } from '../../data/gallery'

function GalleryPage() {
  return (
    <div className="page">
      <SectionHeader
        eyebrow="Gallery"
        title="Snapshots from Sessions"
        subtitle="Workshops, competitions, and project showcases captured across the semester."
      />

      <div className="gallery-grid">
        {gallery.map((item) => (
          <article key={item.id} className="gallery-card">
            <img src={item.imageUrl} alt={item.caption} />
            <div className="gallery-meta">
              <h3>{item.event}</h3>
              <p>{item.caption}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default GalleryPage
