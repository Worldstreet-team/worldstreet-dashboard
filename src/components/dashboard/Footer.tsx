const Footer = () => {
  return (
    <footer className="py-6 animate-fade-in">
      <p className="text-xs text-center text-muted font-medium tracking-wide">
        \u00A9 {new Date().getFullYear()} WorldStreet. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
