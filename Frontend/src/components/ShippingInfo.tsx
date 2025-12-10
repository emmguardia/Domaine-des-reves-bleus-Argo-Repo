import React from 'react';
import { FaTruck, FaMapMarkerAlt, FaClock } from 'react-icons/fa';

interface ShippingInfoProps {
  shippingCalculation: any | null;
  isCalculating: boolean;
}

const ShippingInfo: React.FC<ShippingInfoProps> = ({ shippingCalculation, isCalculating }) => {
  if (isCalculating) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <FaTruck className="animate-pulse" />
          <span className="font-medium">Calcul des frais de port en cours...</span>
        </div>
      </div>
    );
  }

  if (!shippingCalculation) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <FaMapMarkerAlt />
          <span className="text-sm">Saisissez votre adresse pour calculer les frais de port</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-green-700">
          <FaTruck />
          <span className="font-medium">Frais de port calculés</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <FaMapMarkerAlt className="text-gray-500" />
            <span className="text-gray-600">
              Distance: <span className="font-medium">{shippingCalculation.distanceKm} km</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <FaClock className="text-gray-500" />
            <span className="text-gray-600">
              Livraison: <span className="font-medium">{shippingCalculation.estimatedDeliveryDays} jour{shippingCalculation.estimatedDeliveryDays > 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-green-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Expédition depuis :</span>
            <span className="font-medium text-gray-800">1747 route de Mâcon, 01660 Mézériat</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;
