
import React from "react";
import { Mail, Phone } from "lucide-react";

interface ContactInfoProps {
  email: string;
  phone?: string;
}

const ContactInfoSection = ({ email, phone }: ContactInfoProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Informations de contact
      </h3>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{email}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfoSection;
