import { Button, Heading } from "@medusajs/ui"

const Hero = () => {
  return (
    <section className="home-hero-wrap border-b border-ui-border-base">
      <div className="content-container home-hero-grid">
        <div className="home-hero-copy home-animate-slide-in-left">
          <p className="home-hero-kicker">Bangladesh x Thailand Imports</p>
          <Heading level="h1" className="home-hero-title">
            Authentic Thailand products delivered across Bangladesh.
          </Heading>
          <Heading level="h2" className="home-hero-subtitle">
            From Thai snacks and skincare to home essentials and fashion picks,
            shop trusted imports with transparent pricing and fast local delivery.
          </Heading>
          <div className="home-hero-actions">
            <a href="/store">
              <Button variant="secondary">Shop Thailand Products</Button>
            </a>
            <a href="/collections">
              <Button variant="transparent">See Top Categories</Button>
            </a>
          </div>
          <div className="home-hero-badges" aria-label="Store promises">
            <span>100% authentic sourcing</span>
            <span>Cash on delivery eligible</span>
            <span>Popular in Dhaka and Chattogram</span>
          </div>
        </div>

        <div className="home-hero-visual home-animate-float" aria-label="Featured visual collage">
          <img
            src="/thai-market-hero.svg"
            alt="Thailand imported lifestyle products"
            className="home-hero-main-image"
            loading="eager"
          />
          <div className="home-hero-price-tag" aria-hidden="true">
            New Arrival Drops Weekly
          </div>
          <img
            src="/thai-skincare-card.svg"
            alt="Thai imported skincare essentials"
            className="home-hero-floating image-one"
            loading="lazy"
          />
          <img
            src="/thai-snacks-card.svg"
            alt="Thai snacks and drinks collection"
            className="home-hero-floating image-two"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}

export default Hero
