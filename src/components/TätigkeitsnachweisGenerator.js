import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format, getDaysInMonth, parse, isValid } from 'date-fns';

const TätigkeitsnachweisGenerator = () => {
  const [formData, setFormData] = useState({
    einsatzbetrieb: '',
    einsatzort: '',
    mitarbeiterName: '',
    monatJahr: format(new Date(), 'MM/yyyy'),
    days: [],
    bemerkungen: ''
  });

  seEffect(() => {
  updateDaysForMonth();
}, [updateDaysForMonth, formData.monatJahr]);

  const updateDaysForMonth = () => {
    try {
      const monthDate = parse(formData.monatJahr, 'MM/yyyy', new Date());
      if (!isValid(monthDate)) return;
      
      const daysInMonth = getDaysInMonth(monthDate);
      const newDays = Array(daysInMonth).fill().map((_, i) => ({
        begin: '',
        end: '',
        pause: '30'
      }));
      setFormData(prev => ({ ...prev, days: newDays }));
    } catch (e) {
      console.error('Invalid month format');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDayChange = (index, field, value) => {
    const newDays = [...formData.days];
    newDays[index] = { ...newDays[index], [field]: value };
    setFormData(prev => ({ ...prev, days: newDays }));
  };

  const calculateHours = (begin, end, pause) => {
    if (!begin || !end) return 0;
    const [beginHours, beginMins] = begin.split(':').map(Number);
    const [endHours, endMins] = end.split(':').map(Number);
    const totalMinutes = (endHours * 60 + endMins) - (beginHours * 60 + beginMins) - (parseInt(pause) || 0);
    return totalMinutes / 60;
  };

  const generatePDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
try {
      // Option 1: If you have the logo as a URL
      //const logoUrl = 'https://example.com/logo.png';
      //const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      //const logoImage = await pdfDoc.embedPng(logoImageBytes);
      
      // Option 2: If you have the logo in your project's public folder
      const logoImageBytes = await fetch('/Puro_logo.png').then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoImageBytes);
      
      // Draw the logo (adjust dimensions as needed)
      page.drawImage(logoImage, {
        x: 50,
        y: 680,
        width: 200,
        height: 150,
      });
      
      
    } catch (logoError) {
      console.warn('Could not load logo:', logoError);
      // Fallback to original header position if logo fails
      page.drawText('Tätigkeitsnachweis', {
        x: 50,
        y: 800,
        size: 16,
        font: helveticaBold
      });
    }

    // Rest of your existing PDF generation code...
    page.drawText(`Einsatzbetrieb: ${formData.einsatzbetrieb}`, {
      x: 50,
      y: 720,  // adjusted from 770 to account for logo space
      size: 12,
      font: helveticaFont
    });

      
      // Header
      page.drawText('Tätigkeitsnachweis', {
        x: 350,
        y: 800,
        size: 16,
        font: helveticaBold
      });

      page.drawText(`Einsatzbetrieb: ${formData.einsatzbetrieb}`, {
        x: 50,
        y: 770,
        size: 12,
        font: helveticaFont
      });

      page.drawText(`Mitarbeiter (Name / Vorname): ${formData.mitarbeiterName}`, {
        x: 50,
        y: 750,
        size: 12,
        font: helveticaFont
      });

      // Split days
      const midPoint = Math.ceil(formData.days.length / 2);
      const leftColumnDays = formData.days.slice(0, midPoint);
      const rightColumnDays = formData.days.slice(midPoint);

      // Draw table function with borders
      const drawTable = (x, y, days, startDay) => {
        const columnWidths = [30, 50, 50, 50, 60];
        const rowHeight = 20;
        const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
        const tableHeight = (days.length + 1) * rowHeight;

        // Draw outer border
        page.drawRectangle({
          x,
          y: y - tableHeight,
          width: tableWidth,
          height: tableHeight,
          borderWidth: 1,
          borderColor: rgb(0, 0, 0),
        });

        // Draw horizontal lines
        for (let i = 1; i <= days.length; i++) {
          page.drawLine({
            start: { x, y: y - (i * rowHeight) },
            end: { x: x + tableWidth, y: y - (i * rowHeight) },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }

        // Draw vertical lines
        let xPos = x;
        for (let i = 0; i < columnWidths.length - 1; i++) {
          xPos += columnWidths[i];
          page.drawLine({
            start: { x: xPos, y },
            end: { x: xPos, y: y - tableHeight },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }

        // Draw headers
        const headers = ['Tag', 'Beginn', 'Ende', 'Pause', 'Stunden'];
        headers.forEach((header, i) => {
          page.drawText(header, {
            x: x + (i === 0 ? 8 : columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5),
            y: y - 15,
            size: 10,
            font: helveticaBold
          });
        });

        // Draw rows
        days.forEach((day, index) => {
          const yPos = y - 35 - (index * rowHeight);
          const hours = calculateHours(day.begin, day.end, day.pause);

          page.drawText(`${startDay + index}.`, {
            x: x + 8,
            y: yPos,
            size: 10,
            font: helveticaFont
          });

          page.drawText(day.begin || '-', {
            x: x + 40,
            y: yPos,
            size: 10,
            font: helveticaFont
          });

          page.drawText(day.end || '-', {
            x: x + 90,
            y: yPos,
            size: 10,
            font: helveticaFont
          });

          page.drawText(day.pause || '30', {
            x: x + 140,
            y: yPos,
            size: 10,
            font: helveticaFont
          });

          page.drawText(hours > 0 ? hours.toFixed(2) : '-', {
            x: x + 190,
            y: yPos,
            size: 10,
            font: helveticaFont
          });
        });
      };

      // Draw tables
      drawTable(50, 700, leftColumnDays, 1);
      drawTable(320, 700, rightColumnDays, midPoint + 1);

      // Calculate total hours
      const totalHours = formData.days.reduce((sum, day) => sum + calculateHours(day.begin, day.end, day.pause), 0);
      
      // Draw single "Gesamt" below tables
      const tableBottom = 700 - (Math.max(leftColumnDays.length, rightColumnDays.length) * 20) - 50;
      
      page.drawText('Gesamt:', {
        x: 320,
        y: tableBottom - 20,
        size: 10,
        font: helveticaBold
      });

      page.drawText(totalHours.toFixed(2), {
        x: 370,
        y: tableBottom - 20,
        size: 10,
        font: helveticaBold
      });

      // Pause rules
      page.drawText('Pausenzeiten:', {
        x: 50,
        y: tableBottom - 50,
        size: 10,
        font: helveticaBold
      });

      page.drawText('• Bei einer Arbeitszeit von über 6 Stunden, mindestens 30 Minuten Pause', {
        x: 50,
        y: tableBottom - 65,
        size: 10,
        font: helveticaFont
      });

      page.drawText('• Bei einer Arbeitszeit von über 9 Stunden, mindestens 45 Minuten Pause', {
        x: 50,
        y: tableBottom - 80,
        size: 10,
        font: helveticaFont
      });

      // Remarks section
      page.drawText('Bemerkungen:', {
        x: 50,
        y: tableBottom - 110,
        size: 10,
        font: helveticaBold
      });

      page.drawText(formData.bemerkungen || '-', {
        x: 50,
        y: tableBottom - 125,
        size: 10,
        font: helveticaFont
      });

      // Signature section
      page.drawText('Hiermit bestätigen wir die Richtigkeit der Angaben und erkennen diese an.', {
        x: 50,
        y: tableBottom - 155,
        size: 10,
        font: helveticaFont
      });

      page.drawText('Für Ordnungsmäßigkeit und Richtigkeit der Gesamttangaben', {
        x: 50,
        y: tableBottom - 170,
        size: 10,
        font: helveticaFont
      });

      page.drawText('Datum / Unterschrift Mitarbeiter ___________________________', {
        x: 50,
        y: tableBottom - 185,
        size: 10,
        font: helveticaFont
      });

      // Download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Tätigkeitsnachweis_${formData.monatJahr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check console for details.');
    }
  };

  const midPoint = Math.ceil(formData.days.length / 2);
  const leftColumnDays = formData.days.slice(0, midPoint);
  const rightColumnDays = formData.days.slice(midPoint);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>Tätigkeitsnachweis Generator</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Einsatzbetrieb:</label>
        <input
          type="text"
          name="einsatzbetrieb"
          value={formData.einsatzbetrieb}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Mitarbeiter (Name / Vorname):</label>
        <input
          type="text"
          name="mitarbeiterName"
          value={formData.mitarbeiterName}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Monat / Jahr (MM/yyyy):</label>
        <input
          type="text"
          name="monatJahr"
          value={formData.monatJahr}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
          placeholder="MM/yyyy"
        />
      </div>
      
      <h2 style={{ marginBottom: '10px' }}>Arbeitszeiten</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3>1. - {midPoint}.</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Tag</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Beginn</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Ende</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Pause</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Stunden</th>
              </tr>
            </thead>
            <tbody>
              {leftColumnDays.map((day, index) => {
                const hours = calculateHours(day.begin, day.end, day.pause);
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{index + 1}.</td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="time"
                        value={day.begin}
                        onChange={(e) => handleDayChange(index, 'begin', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="time"
                        value={day.end}
                        onChange={(e) => handleDayChange(index, 'end', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        value={day.pause}
                        onChange={(e) => handleDayChange(index, 'pause', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                        min="0"
                      />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {hours > 0 ? hours.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div style={{ flex: 1 }}>
          <h3>{midPoint + 1}. - {formData.days.length}.</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Tag</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Beginn</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Ende</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Pause</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Stunden</th>
              </tr>
            </thead>
            <tbody>
              {rightColumnDays.map((day, index) => {
                const originalIndex = midPoint + index;
                const hours = calculateHours(day.begin, day.end, day.pause);
                return (
                  <tr key={originalIndex} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{originalIndex + 1}.</td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="time"
                        value={day.begin}
                        onChange={(e) => handleDayChange(originalIndex, 'begin', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="time"
                        value={day.end}
                        onChange={(e) => handleDayChange(originalIndex, 'end', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        value={day.pause}
                        onChange={(e) => handleDayChange(originalIndex, 'pause', e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                        min="0"
                      />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {hours > 0 ? hours.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Bemerkungen:</label>
        <textarea
          name="bemerkungen"
          value={formData.bemerkungen}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', minHeight: '100px' }}
        />
      </div>
      
      <button
        onClick={generatePDF}
        style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '12px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'block',
          margin: '0 auto',
          width: '200px'
        }}
      >
        PDF generieren
      </button>
    </div>
  );
};

export default TätigkeitsnachweisGenerator;