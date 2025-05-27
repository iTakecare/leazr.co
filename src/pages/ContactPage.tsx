
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

const ContactPage = () => {
  const contactInfo = [
    {
      icon: <Phone className="h-6 w-6 text-blue-600" />,
      title: 'Téléphone',
      content: '+32 2 123 45 67'
    },
    {
      icon: <Mail className="h-6 w-6 text-blue-600" />,
      title: 'Email',
      content: 'contact@leazr.be'
    },
    {
      icon: <MapPin className="h-6 w-6 text-blue-600" />,
      title: 'Adresse',
      content: 'Avenue Louise 123, 1050 Bruxelles'
    },
    {
      icon: <Clock className="h-6 w-6 text-blue-600" />,
      title: 'Horaires',
      content: 'Lun-Ven: 9h-18h'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Contactez-nous</h1>
            <p className="text-xl mb-8">
              Notre équipe est là pour répondre à toutes vos questions sur Leazr
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Envoyez-nous un message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Prénom</label>
                    <Input placeholder="Votre prénom" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom</label>
                    <Input placeholder="Votre nom" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input type="email" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Entreprise</label>
                  <Input placeholder="Nom de votre entreprise" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sujet</label>
                  <Input placeholder="Objet de votre message" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea placeholder="Votre message..." rows={6} />
                </div>
                <Button className="w-full">Envoyer le message</Button>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Informations de contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {info.icon}
                      <div>
                        <h3 className="font-medium">{info.title}</h3>
                        <p className="text-gray-600">{info.content}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Besoin d'aide rapidement ?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Consultez notre centre d'aide ou démarrez un chat en direct avec notre équipe support.
                  </p>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full">Centre d'aide</Button>
                    <Button className="w-full">Chat en direct</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
