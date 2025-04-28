import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-blue text-white py-4 border-t border-white/90 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
         
        </div>
        <div className="text-center text-white/80">
          <p>&copy; {new Date().getFullYear()} Patte pe Patta. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 