import {
  ContactSection,
  HeroSection,
  HowItWorksSection,
  NetworkSection,
  OneSection,
  SiteFooter,
  WalletSection,
} from "./components/site-sections";

export default function Home() {
  return <main><HeroSection /><NetworkSection /><HowItWorksSection /><OneSection /><WalletSection /><ContactSection /><SiteFooter /></main>;
}
