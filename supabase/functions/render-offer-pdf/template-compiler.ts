import Handlebars from "npm:handlebars@4.7.8";

export function compileTemplate(htmlTemplate: string, data: any): string {
  // Register Handlebars helpers
  Handlebars.registerHelper('currency', (value: number, currency = 'EUR') => {
    if (typeof value !== 'number') return '0,00 €';
    
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: currency,
    }).format(value);
  });

  Handlebars.registerHelper('date', (value: Date | string, format = 'short') => {
    const dateObj = value instanceof Date ? value : new Date(value);
    
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: format as any,
    }).format(dateObj);
  });

  Handlebars.registerHelper('number', (value: number) => {
    if (typeof value !== 'number') return '0';
    return new Intl.NumberFormat('fr-BE').format(value);
  });

  // Compile and execute template
  const template = Handlebars.compile(htmlTemplate);
  return template(data);
}
