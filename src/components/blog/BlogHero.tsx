
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BlogHero = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to handle subscription
    console.log("Subscribing email:", email);
    setEmail("");
    // Add toast notification here if needed
  };

  return (
    <div className="flex flex-col min-h-[60vh] items-center gap-6 md:gap-10 py-4 md:py-10 relative">
      {/* Background image - kept from original */}
      <div className="flex flex-col w-full h-[60vh] items-start gap-2.5 absolute top-0 left-0">
        <img
          className="relative w-full h-[60vh] object-cover"
          alt="Background"
          src="/clip-path-group.png"
        />
        {/* Gradient fade to white overlay */}
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Hero content */}
      <header className="relative w-full max-w-[1000px] mx-auto z-10 px-5 md:px-[37px] mt-24 text-center">
        <h1 className="font-black text-[#222222] text-4xl sm:text-5xl md:text-6xl leading-tight mb-6">
          Le pouvoir du leasing pour la
          <div className="inline-block bg-[#48b5c3]/30 rounded-lg px-6 py-2 mt-2 mx-auto">
            <span className="text-[#48b5c3] font-black">réussite des entreprises</span>
          </div>
        </h1>
        
        <p className="font-normal text-[#222222] text-base md:text-lg mb-8 max-w-[700px] mx-auto">
          Recevez les derniers articles dans votre boîte mail !
        </p>

        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <Input 
            placeholder="Entrez votre email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="py-6 px-4 rounded-md border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
          />
          <Button 
            type="submit"
            className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-md font-medium py-2 px-6 min-w-[110px]"
          >
            S'abonner
          </Button>
        </form>
      </header>
    </div>
  );
};

export default BlogHero;
