import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"

export default function PreviewLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f3ec] text-[#13211e]">
      <div className="[&_header]:!bg-[#0b4f3f] [&_header]:!border-b-0 [&_header]:!shadow-none [&_header]:!backdrop-blur-none [&_nav]:!max-w-none [&_nav]:!px-[clamp(1rem,3.5vw,3rem)] [&_nav]:!text-[#f7f3ec] [&_a]:!text-[#f7f3ec] [&_span]:!text-[#f7f3ec] [&_button]:!text-[#f7f3ec]">
        <Nav />
      </div>

      {props.children}

      <div className="[&_footer]:!mt-0 [&_footer]:!border-t-0 [&_footer]:!bg-[#0b4f3f] [&_footer]:!shadow-none [&_footer_.content-container]:!max-w-none [&_footer_.content-container]:!px-[clamp(1rem,3.5vw,3rem)] [&_footer_*]:!text-[#f7f3ec] [&_footer_a]:!text-[#f7f3ec]">
        <Footer />
      </div>
    </div>
  )
}
