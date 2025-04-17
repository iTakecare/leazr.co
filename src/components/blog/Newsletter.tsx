
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simuler l'envoi (à remplacer par une vraie API)
    setTimeout(() => {
      toast({
        title: "Succès",
        description: "Vous êtes maintenant inscrit à notre newsletter !",
      });
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="bg-[#f8f8f6] rounded-xl p-8 my-12">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold mb-3">Restez informé</h3>
        <p className="text-gray-600 mb-6">
          Inscrivez-vous à notre newsletter pour recevoir nos derniers articles, conseils et offres spéciales directement dans votre boîte mail.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="Votre adresse email"
            className="flex-grow"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button 
            type="submit"
            className="bg-[#48b5c3] hover:bg-[#3da6b4] whitespace-nowrap"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Inscription..." : "S'inscrire"}
          </Button>
        </form>
        
        <p className="text-xs text-gray-500 mt-4">
          En vous inscrivant, vous acceptez de recevoir nos emails. Vous pouvez vous désinscrire à tout moment.
        </p>
      </div>
    </div>
  );
};

export default Newsletter;
