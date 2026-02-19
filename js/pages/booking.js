/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Booking Page Controller
 * ============================================================
 */

import { storage } from '../core/StorageManager.js';
import { DateUtils } from '../utils/DateUtils.js';
import { Validator } from '../utils/Validator.js';
import { toast } from '../components/ToastSystem.js';
import { CONFIG } from '../core/Config.js';

class BookingController {
  constructor() {
    this.calendar = null;
    this.selectedDate = null;
    this.selectedSlot = null;
    this.availability = [];
    this.professional = null;
  }

  async init() {
    this.professional = storage.getProfessional();
    this._loadProfessionalInfo();
    this._initCalendar();
    this._loadAvailability();
    this._bindEvents();
  }

  _loadProfessionalInfo() {
    const nameEl = document.getElementById('bookingProfName');
    const titleEl = document.getElementById('bookingProfTitle');

    if (nameEl) {
      nameEl.textContent = this.professional.name || 'Professionnel';
    }
    if (titleEl) {
      titleEl.textContent = this.professional.profession || 'Praticien bien-être';
    }
  }

  _initCalendar() {
    const calendarEl = document.getElementById('bookingCalendar');
    if (!calendarEl) return;

    this.calendar = new FullCalendar.Calendar(calendarEl, {
      locale: 'fr',
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next',
        center: 'title',
        right: '',
      },
      selectable: true,
      selectMirror: true,
      select: (info) => this._onDateSelect(info),
      dayCellClassNames: (info) => {
        const dateStr = info.date.toISOString().split('T')[0];
        const dayOfWeek = info.date.getDay();
        const hasAvailability = this._hasAvailabilityOnDay(dayOfWeek);
        return hasAvailability ? [] : ['fc-day-disabled'];
      },
      validRange: {
        start: new Date(),
      },
    });

    this.calendar.render();
  }

  _hasAvailabilityOnDay(dayOfWeek) {
    return this.availability.some(slot => slot.dayOfWeek === dayOfWeek);
  }

  _loadAvailability() {
    this.availability = storage.getAvailability();
    if (this.availability.length === 0) {
      // Disponibilités par défaut
      this.availability = [
        { dayOfWeek: 1, start: '09:00', end: '18:00' }, // Lundi
        { dayOfWeek: 2, start: '09:00', end: '18:00' }, // Mardi
        { dayOfWeek: 3, start: '09:00', end: '18:00' }, // Mercredi
        { dayOfWeek: 4, start: '09:00', end: '18:00' }, // Jeudi
        { dayOfWeek: 5, start: '09:00', end: '18:00' }, // Vendredi
      ];
    }
    this.calendar?.render();
  }

  _onDateSelect(info) {
    const date = info.start;
    const dayOfWeek = date.getDay();
    
    // Vérifie si le jour est disponible
    if (!this._hasAvailabilityOnDay(dayOfWeek)) {
      toast.warning('Ce jour n\'est pas disponible pour la réservation');
      return;
    }

    this.selectedDate = date;
    const dateStr = date.toISOString().split('T')[0];
    
    // Met à jour le label
    const label = document.getElementById('selectedDateLabel');
    if (label) {
      label.textContent = DateUtils.formatDate(dateStr, { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Génère les créneaux
    this._generateSlots(date);

    // Met à jour les étapes
    document.getElementById('step1')?.classList.add('step--completed');
    document.getElementById('step2')?.classList.add('step--active');
  }

  _generateSlots(date) {
    const container = document.getElementById('slotsList');
    if (!container) return;

    const dayOfWeek = date.getDay();
    const dayAvailability = this.availability.filter(a => a.dayOfWeek === dayOfWeek);
    
    if (dayAvailability.length === 0) {
      container.innerHTML = '<p style="color: var(--hs-text-muted); text-align: center">Aucun créneau disponible ce jour.</p>';
      return;
    }

    // Récupère les RDV existants
    const existingEvents = storage.getAllEvents({
      startDate: DateUtils.startOfDay(date.toISOString()),
      endDate: DateUtils.endOfDay(date.toISOString()),
    });

    const slots = [];
    const defaultDuration = this.professional.defaultDuration || 60;

    dayAvailability.forEach(availability => {
      let currentTime = DateUtils.parseDateTime(date.toISOString(), availability.start);
      const endTime = DateUtils.parseDateTime(date.toISOString(), availability.end);

      while (currentTime < endTime) {
        const slotStart = currentTime.toISOString();
        const slotEnd = DateUtils.addMinutes(slotStart, defaultDuration);

        // Vérifie si le créneau est libre
        const isAvailable = !existingEvents.some(ev => 
          DateUtils.hasOverlap(slotStart, slotEnd, ev.start, ev.end, 20)
        );

        if (isAvailable && new Date(slotEnd) <= endTime) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            label: DateUtils.formatTime(slotStart),
          });
        }

        currentTime = new Date(DateUtils.addMinutes(slotStart, defaultDuration + 20));
      }
    });

    if (slots.length === 0) {
      container.innerHTML = '<p style="color: var(--hs-text-muted); text-align: center">Tous les créneaux sont réservés pour ce jour.</p>';
      return;
    }

    container.innerHTML = `
      <div class="slots-grid">
        ${slots.map(slot => `
          <button 
            type="button" 
            class="slot-btn" 
            data-slot-start="${slot.start}"
            data-slot-end="${slot.end}"
          >
            ${slot.label}
          </button>
        `).join('')}
      </div>
    `;

    // Bind les clics sur les créneaux
    container.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => this._selectSlot(btn));
    });
  }

  _selectSlot(btn) {
    // Désélectionne les autres
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('slot-btn--selected'));
    btn.classList.add('slot-btn--selected');

    this.selectedSlot = {
      start: btn.dataset.slotStart,
      end: btn.dataset.slotEnd,
    };

    // Affiche le formulaire
    const formSection = document.getElementById('bookingFormSection');
    const slotLabel = document.getElementById('selectedSlotLabel');
    
    if (formSection) {
      formSection.classList.remove('hs-hidden');
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (slotLabel) {
      slotLabel.textContent = DateUtils.formatDateTime(this.selectedSlot.start);
    }

    // Met à jour les champs cachés
    document.getElementById('bookingStart').value = this.selectedSlot.start;
    document.getElementById('bookingEnd').value = this.selectedSlot.end;

    // Met à jour les étapes
    document.getElementById('step2')?.classList.add('step--completed');
    document.getElementById('step3')?.classList.add('step--active');
  }

  _bindEvents() {
    const form = document.getElementById('formBooking');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Validation
      const validation = Validator.validateBooking(data);
      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError);
        return;
      }

      // Désactive le bouton
      const submitBtn = document.getElementById('btnBookingSubmit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Envoi...';
      }

      try {
        // Crée le RDV en statut "pending"
        const result = storage.addEvent({
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          start: data.bookingStart,
          end: data.bookingEnd,
          notes: data.notes,
          status: CONFIG.STATUS.PENDING,
          source: 'booking_page',
        });

        if (result.success) {
          // Affiche le succès
          const formSection = document.getElementById('bookingFormSection');
          const successSection = document.getElementById('bookingSuccess');
          
          if (formSection) formSection.classList.add('hs-hidden');
          if (successSection) {
            successSection.classList.remove('hs-hidden');
            successSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          toast.success('Demande envoyée avec succès !');
        } else {
          throw new Error('Erreur lors de la création du rendez-vous');
        }
      } catch (error) {
        toast.error(error.message || 'Une erreur est survenue');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            Confirmer ma demande
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          `;
        }
      }
    });
  }
}

// Initialise le contrôleur
const controller = new BookingController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
  controller.init();
}
