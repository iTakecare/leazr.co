import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Headset, Mail, Ticket, Settings2 } from "lucide-react";
import ContactSubmissionsList from "@/components/support/ContactSubmissionsList";
import SupportTicketsList from "@/components/support/SupportTicketsList";
import EmailInbox from "@/components/support/EmailInbox";
import ImapSettingsForm from "@/components/support/ImapSettingsForm";

const SupportPage = () => {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez les demandes de contact, tickets et emails
        </p>
      </div>

      <Tabs defaultValue="submissions" className="w-full">
        <TabsList>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Formulaire de contact
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Headset className="h-4 w-4" />
            Boîte mail
          </TabsTrigger>
          <TabsTrigger value="imap" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration IMAP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <ContactSubmissionsList />
        </TabsContent>
        <TabsContent value="tickets">
          <SupportTicketsList />
        </TabsContent>
        <TabsContent value="inbox">
          <EmailInbox />
        </TabsContent>
        <TabsContent value="imap">
          <ImapSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportPage;
