
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("Merci pour votre inscription à notre newsletter!");
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="w-full bg-[#f8f8f6] py-16 my-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-3">Restez informé</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Abonnez-vous à notre newsletter pour recevoir nos derniers articles, conseils et actualités sur le leasing informatique durable.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Votre adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-grow py-6 px-4 rounded-full"
          />
          <Button 
            type="submit" 
            className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-full py-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Inscription..." : "S'inscrire"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Newsletter;
