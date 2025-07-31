import Image from 'next/image'

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <Image
                src="/yourdai_logo.png"
                alt="yourdai logo"
                width={124}
                height={32}
                className="h-8 w-auto"
                priority
                quality={100}
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Transform your productivity with AI-powered daily planning.
              Accomplish more, stress less, and achieve your goals with intelligent task management.
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2025 yourdai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
