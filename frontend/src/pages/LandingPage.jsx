import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Globe, CreditCard, Users, BarChart3, Download,
  Check, Star, ArrowRight, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    // Navigate to custom login page
    navigate('/login');
  };

  const features = [
    {
      icon: FileText,
      title: "Multi-Format Documents",
      description: "Create invoices, receipts, quotes, credit notes, purchase orders and more - all from one platform.",
      large: true
    },
    {
      icon: Globe,
      title: "Global Tax Compliance",
      description: "Customizable tax rates per invoice. Set 0% to 100% for VAT, GST, or any tax type.",
      large: false
    },
    {
      icon: CreditCard,
      title: "Payment Integration",
      description: "Accept payments via Stripe, PayPal, and Google Pay directly from your invoices.",
      large: false
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Store and manage customer details for quick invoice creation.",
      large: false
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track revenue, outstanding payments, and business performance at a glance.",
      large: false
    },
    {
      icon: Download,
      title: "Export Anywhere",
      description: "Download professional PDFs instantly. Share with clients in seconds.",
      large: true
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "£0",
      period: "/month",
      description: "Perfect for trying out",
      features: [
        "5 downloads total (permanent limit)",
        "All document types",
        "Basic customer management",
        "PDF exports",
        "Email support"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      name: "Professional",
      price: "£5",
      period: "/month",
      description: "For growing businesses",
      features: [
        "Unlimited downloads",
        "All document types",
        "Advanced customer management",
        "PDF & JPEG exports",
        "Payment integration",
        "Priority support",
        "Custom branding"
      ],
      cta: "Get Started",
      popular: true
    },
    {
      name: "Enterprise",
      price: "£49.90",
      period: "/month",
      description: "For large organizations",
      features: [
        "Everything in Professional",
        "Multi-user access",
        "API access",
        "Advanced analytics",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "Freelance Designer",
      content: "Realtouch Invoice transformed how I manage my business finances. The customizable tax rates are a lifesaver for my international clients!",
      rating: 5
    },
    {
      name: "James Chen",
      role: "Small Business Owner",
      content: "Finally, an invoicing solution that's both powerful and easy to use. The PDF exports look incredibly professional.",
      rating: 5
    },
    {
      name: "Emma Williams",
      role: "Accountant",
      content: "I recommend Realtouch Invoice to all my clients. The multi-format support and global compliance features are unmatched.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_77cf16cd-eadc-4d0e-b24f-9448ffa83e9e/artifacts/8fhvo7zu_image.png"
                alt="Realtouch Invoice"
                className="h-10 w-auto"
              />
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-[#0066cc] transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-[#0066cc] transition-colors font-medium">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-[#0066cc] transition-colors font-medium">Testimonials</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={handleLogin}
                className="text-slate-600 hover:text-[#0066cc]"
                data-testid="nav-login-btn"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleLogin}
                className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
                data-testid="nav-get-started-btn"
              >
                Get Started Free
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 p-4">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-slate-600 py-2">Features</a>
              <a href="#pricing" className="text-slate-600 py-2">Pricing</a>
              <a href="#testimonials" className="text-slate-600 py-2">Testimonials</a>
              <Button onClick={handleLogin} className="bg-[#0066cc] text-white w-full">
                Get Started Free
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 lg:px-24 hero-bg overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            {/* Left - Value Prop */}
            <div className="md:col-span-7 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0066cc] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Globe className="w-4 h-4" />
                Trusted by businesses worldwide
              </div>
              
              <h1 className="font-space-mono text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Professional Invoicing,{" "}
                <span className="text-[#0066cc]">Simplified Globally</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl leading-relaxed">
                Create professional invoices, receipts, and quotes in seconds. 
                Customizable tax rates, multiple formats, and seamless payment integration.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={handleLogin}
                  size="lg"
                  className="bg-[#0066cc] hover:bg-[#0052a3] text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                  data-testid="hero-start-free-btn"
                >
                  Start Free Today
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-slate-300 px-8 py-6 text-lg"
                >
                  Watch Demo
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  5 free downloads to start
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Cancel anytime
                </div>
              </div>
            </div>

            {/* Right - Invoice Preview */}
            <div className="md:col-span-5 animate-fade-in-up stagger-2">
              <div className="invoice-preview bg-white rounded-lg shadow-2xl p-6 animate-float">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-space-mono text-lg font-bold text-[#0066cc]">INVOICE</h3>
                    <p className="text-xs text-slate-500 font-mono">INV-00042</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Dec 20, 2025</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-mono rounded-full">PAID</span>
                  </div>
                </div>
                
                <div className="space-y-1 mb-6 text-sm">
                  <p className="font-medium text-slate-900">Bill To:</p>
                  <p className="text-slate-600">Acme Corporation</p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Web Design Services</span>
                    <span className="font-mono">£2,500.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Logo Design</span>
                    <span className="font-mono">£500.00</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 mt-4 pt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono">£3,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tax (20%)</span>
                    <span className="font-mono">£600.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t">
                    <span>Total</span>
                    <span className="font-mono text-[#0066cc]">£3,600.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 md:px-12 lg:px-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#0066cc] mb-4 block">FEATURES</span>
            <h2 className="font-space-mono text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to manage invoices
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed for businesses of all sizes
            </p>
          </div>

          <div className="bento-grid">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`card p-8 ${feature.large ? 'bento-item-large' : 'bento-item-small'} animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-[#0066cc]" />
                </div>
                <h3 className="font-space-mono text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 md:px-12 lg:px-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#0066cc] mb-4 block">PRICING</span>
            <h2 className="font-space-mono text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-slate-600">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative bg-white rounded-2xl p-8 ${plan.popular ? 'pricing-highlight' : 'border border-slate-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0066cc] text-white text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="font-space-mono text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-space-mono text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={handleLogin}
                  className={`w-full py-6 ${plan.popular 
                    ? 'bg-[#0066cc] hover:bg-[#0052a3] text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                  data-testid={`pricing-${plan.name.toLowerCase()}-btn`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 md:px-12 lg:px-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#0066cc] mb-4 block">TESTIMONIALS</span>
            <h2 className="font-space-mono text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Loved by businesses worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066cc] to-[#10b981] flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-12 lg:px-24 bg-gradient-to-r from-[#0066cc] to-[#0052a3]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-space-mono text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to streamline your invoicing?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses using Realtouch Invoice
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-white text-[#0066cc] hover:bg-blue-50 px-10 py-6 text-lg font-semibold shadow-xl"
            data-testid="cta-start-free-btn"
          >
            Start Free Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 lg:px-24 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="https://customer-assets.emergentagent.com/job_77cf16cd-eadc-4d0e-b24f-9448ffa83e9e/artifacts/8fhvo7zu_image.png"
                  alt="Realtouch Invoice"
                  className="h-8 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm">
                Realtouch Global Ventures Ltd<br />
                Company No. 16578193
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-sm text-center">
            <p>© 2025 Realtouch Global Ventures Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
