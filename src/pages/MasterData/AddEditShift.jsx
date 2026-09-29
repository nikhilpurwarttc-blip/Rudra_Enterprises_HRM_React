import { useEffect, useState } from 'react';

import InputField from '../../components/InputField';
import RightModal from '../components/RightModal';
import Switch from '../../components/Switch';


// --------------------------------------------------
// Constants
// --------------------------------------------------

const EMPTY_FORM = {
    name: '',
    duration_hours: '',
    start_time: '',
    end_time: '',
    status: true,
};


// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatTime = (value) => {
    return String(value ?? '').slice(0, 5);
};


const normalize = (shift) => ({
    ...EMPTY_FORM,
    ...(shift ?? {}),

    start_time: formatTime(shift?.start_time),
    end_time: formatTime(shift?.end_time),

    status:
        shift?.status == null
            ? true
            : Boolean(shift.status),
});


/**
 * Convert HH:mm into minutes.
 *
 * Example:
 * 08:30 → 510
 */
const timeToMinutes = (time) => {
    if (!time) return null;

    const [hours, minutes] = time
        .split(':')
        .map(Number);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return null;
    }

    return hours * 60 + minutes;
};


/**
 * Convert minutes into HH:mm.
 *
 * Supports values greater than 24 hours
 * by wrapping around the next day.
 */
const minutesToTime = (minutes) => {
    const normalized =
        ((minutes % 1440) + 1440) % 1440;

    const hours = Math.floor(
        normalized / 60
    );

    const mins = normalized % 60;

    return `${String(hours).padStart(2, '0')}:${String(
        mins
    ).padStart(2, '0')}`;
};


/**
 * Calculate duration between start and end.
 *
 * Example:
 * 08:00 → 17:00 = 9
 *
 * Overnight:
 * 22:00 → 06:00 = 8
 */
const calculateDuration = (
    startTime,
    endTime
) => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (
        start === null ||
        end === null
    ) {
        return '';
    }

    let difference = end - start;

    // Overnight shift
    if (difference < 0) {
        difference += 1440;
    }

    return difference / 60;
};


/**
 * Calculate end time from start + duration.
 */
const calculateEndTime = (
    startTime,
    duration
) => {
    const start = timeToMinutes(startTime);

    const durationHours = Number(duration);

    if (
        start === null ||
        !Number.isFinite(durationHours) ||
        durationHours < 0
    ) {
        return '';
    }

    const durationMinutes =
        durationHours * 60;

    return minutesToTime(
        start + durationMinutes
    );
};


/**
 * Calculate start time from end + duration.
 */
const calculateStartTime = (
    endTime,
    duration
) => {
    const end = timeToMinutes(endTime);

    const durationHours = Number(duration);

    if (
        end === null ||
        !Number.isFinite(durationHours) ||
        durationHours < 0
    ) {
        return '';
    }

    const durationMinutes =
        durationHours * 60;

    return minutesToTime(
        end - durationMinutes
    );
};


/**
 * Remove unnecessary decimal zeros.
 *
 * 8     → "8"
 * 8.25  → "8.25"
 */
const formatDuration = (value) => {
    if (value === '') {
        return '';
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return '';
    }

    return String(
        Number(number.toFixed(2))
    );
};


// --------------------------------------------------
// Component
// --------------------------------------------------

const AddEditShift = ({
    isOpen,
    shift,
    saving = false,
    errors = {},
    onClose,
    onSubmit,
}) => {
    const [form, setForm] = useState(() =>
        normalize(shift)
    );

    /**
     * Keep track of which field the user
     * changed most recently.
     *
     * This is important because all three
     * fields depend on each other.
     */
    const [lastChanged, setLastChanged] =
        useState(null);


    // ------------------------------------------------
    // Reset form when modal / shift changes
    // ------------------------------------------------

    useEffect(() => {
        setForm(normalize(shift));
        setLastChanged(null);
    }, [shift, isOpen]);


    // ------------------------------------------------
    // Field Change
    // ------------------------------------------------

    const handleFieldChange =
        (field) => (event) => {
            const value =
                event.target.type === 'checkbox'
                    ? event.target.checked
                    : event.target.value;

            // Normal fields
            if (
                field !== 'duration_hours' &&
                field !== 'start_time' &&
                field !== 'end_time'
            ) {
                setForm((current) => ({
                    ...current,
                    [field]: value,
                }));

                return;
            }


            // --------------------------------------------
            // Duration
            // --------------------------------------------

            if (field === 'duration_hours') {
                setLastChanged('duration_hours');

                setForm((current) => {
                    const next = {
                        ...current,
                        duration_hours: value,
                    };

                    /*
                     * Duration + Start Time
                     * → calculate End Time
                     */
                    if (
                        value !== '' &&
                        current.start_time
                    ) {
                        next.end_time =
                            calculateEndTime(
                                current.start_time,
                                value
                            );
                    }

                    return next;
                });

                return;
            }


            // --------------------------------------------
            // Start Time
            // --------------------------------------------

            if (field === 'start_time') {
                setLastChanged('start_time');

                setForm((current) => {
                    const next = {
                        ...current,
                        start_time: value,
                    };

                    /*
                     * Start Time + Duration
                     * → calculate End Time
                     */
                    if (
                        value &&
                        current.duration_hours !== ''
                    ) {
                        next.end_time =
                            calculateEndTime(
                                value,
                                current.duration_hours
                            );
                    }

                    /*
                     * Start Time + End Time
                     * → calculate Duration
                     *
                     * This happens when duration
                     * has not been entered yet.
                     */
                    else if (
                        value &&
                        current.end_time
                    ) {
                        next.duration_hours =
                            formatDuration(
                                calculateDuration(
                                    value,
                                    current.end_time
                                )
                            );
                    }

                    return next;
                });

                return;
            }


            // --------------------------------------------
            // End Time
            // --------------------------------------------

            if (field === 'end_time') {
                setLastChanged('end_time');

                setForm((current) => {
                    const next = {
                        ...current,
                        end_time: value,
                    };

                    /*
                     * Start Time + End Time
                     * → calculate Duration
                     */
                    if (
                        value &&
                        current.start_time
                    ) {
                        next.duration_hours =
                            formatDuration(
                                calculateDuration(
                                    current.start_time,
                                    value
                                )
                            );
                    }

                    /*
                     * End Time + Duration
                     * → calculate Start Time
                     */
                    else if (
                        value &&
                        current.duration_hours !== ''
                    ) {
                        next.start_time =
                            calculateStartTime(
                                value,
                                current.duration_hours
                            );
                    }

                    return next;
                });
            }
        };


    // ------------------------------------------------
    // Submit
    // ------------------------------------------------

    const handleSubmit = () => {
        onSubmit({
            id: form.id,

            name: form.name.trim(),

            start_time: form.start_time,

            end_time: form.end_time,

            duration_hours:
                form.duration_hours === ''
                    ? null
                    : Number(form.duration_hours),

            status: form.status,
        });
    };


    // ------------------------------------------------
    // Render
    // ------------------------------------------------

    return (
        <RightModal
            key={`${isOpen}-${shift?.id ?? 'new'}`}
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={
                form.id
                    ? `Edit — ${form.name}`
                    : 'Add Shift'
            }
            saving={saving}
        >

            {/* ------------------------------------------
          Shift Name
      ------------------------------------------ */}

            <InputField
                label="Shift Name"
                value={form.name}
                onChange={handleFieldChange('name')}
                error={errors.name}
                required
            />


            {/* ------------------------------------------
          Shift Timing
      ------------------------------------------ */}

            {/* Duration */}
            <InputField
                label="Duration (hours)"
                type="number"
                min="0"
                step="0.25"
                value={form.duration_hours}
                onChange={handleFieldChange(
                    'duration_hours'
                )}
                error={errors.duration_hours}
                helperText="e.g. 8 or 8.5"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Start */}
                <InputField
                    label="Start Time"
                    type="time"
                    value={form.start_time}
                    onChange={handleFieldChange(
                        'start_time'
                    )}
                    error={errors.start_time}
                    required
                />

                {/* End */}
                <InputField
                    label="End Time"
                    type="time"
                    value={form.end_time}
                    onChange={handleFieldChange(
                        'end_time'
                    )}
                    error={errors.end_time}
                    required
                />

            </div>




            {/* ------------------------------------------
          Status
      ------------------------------------------ */}

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-(--color-text)">
                        Active Shift
                    </p>

                    <p className="text-xs text-(--color-text-muted)">
                        {form.status
                            ? 'This shift is active'
                            : 'This shift is inactive'}
                    </p>
                </div>

                <Switch
                    checked={form.status}
                    onClick={() =>
                        setForm((current) => ({
                            ...current,
                            status: !current.status,
                        }))
                    }
                    ariaLabel="Toggle shift status"
                    title={
                        form.status
                            ? 'Deactivate shift'
                            : 'Activate shift'
                    }
                />
            </div>

        </RightModal>
    );
};


export default AddEditShift;
