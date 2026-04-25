export default function HowItWorks() {
  return (
    <section className="ss-section" style={{ background: '#0d1a10' }}>
      <div className="ss-max">
        <div className="ss-section-tag ss-section-center">
          HOW SPORTSHIELD FIGHTS SPORT THEFT
        </div>

        <div className="ss-how-grid">
          {/* Left */}
          <div className="ss-how-col">
            <h2>Powerful<br />Technology</h2>
            <p>
              Our advanced perceptual fingerprinting (pHash) engine and reverse image
              search technology scans the open web to find accurate matches of your
              sports media — even when images have been cropped, recoloured, or
              resized. Combined with easy-to-use management tools, you can take action
              against <strong>copyright infringement</strong> in seconds.
            </p>
          </div>

          {/* Plus */}
          <div className="ss-how-plus">+</div>

          {/* Right */}
          <div className="ss-how-col">
            <h2>Legal<br />Protection</h2>
            <p>
              Our built-in DMCA Notice generator and ownership certificate system give
              you everything you need to prove ownership and recover damages from
              unauthorised use of your sports photography, videos, and broadcasts.{' '}
              <strong>No win, no fee!</strong>
            </p>
          </div>
        </div>

        <hr className="ss-how-divider" />

        {/* Get started tag */}
        <div className="ss-section-tag ss-section-center" style={{ marginTop: 40, marginBottom: 0 }}>
          GET STARTED IN MINUTES
        </div>
      </div>
    </section>
  );
}
