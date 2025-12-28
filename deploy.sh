echo "?? Début du déploiement Backend..."

sudo docker build -t domaine-des-reves-bleus-backend:latest .

echo "?? Transfert de l'image vers K3s..."
sudo docker save domaine-des-reves-bleus-backend:latest | sudo k3s ctr images import -

echo "?? Redémarrage du déploiement dans Kubernetes..."
kubectl rollout restart deployment domaine-des-reves-bleus-backend -n domaine-des-reves-bleus

echo "? Déploiement terminé ! Surveille les logs avec :"
echo "k logs -l app=domaine-des-reves-bleus-backend -n domaine-des-reves-bleus -f"