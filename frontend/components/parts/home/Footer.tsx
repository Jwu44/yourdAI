import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 md:py-16 border-t border-border">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-4 lg:col-span-1">
            <a href="#" className="text-2xl font-display font-bold text-yourdai-dark dark:text-white flex items-center mb-4">
              <span className="bg-yourdai-purple text-white p-1 rounded-md mr-2 text-sm">YD</span>
              your<span className="text-yourdai-purple">dai</span>
            </a>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Personalized AI scheduling that adapts to your unique energy patterns and priorities.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">Features</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">Help Center</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">Contact</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-yourdai-purple transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} yourdai. All rights reserved.
          </p>
          
          <div className="flex items-center mt-4 md:mt-0">
            <p className="text-xs text-muted-foreground flex items-center">
              Made with <Heart size={12} className="mx-1 text-yourdai-purple" /> for a more productive world
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
