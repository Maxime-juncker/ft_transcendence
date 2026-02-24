if [[ "$*" == *"--repeat"* ]]; then                                                        
    xset r rate 150 30                                                                     
fi                                                                                         
                                                                                           
ARGS=$(echo "$*" | sed 's/--repeat//g' | xargs)                                            
docker run --rm --name cli-pong -it cli:latest ./cli_app $ARGS                             
                                                                                           
if [[ "$*" == *"--repeat"* ]]; then                                                        
    xset r rate 660 25                                                                     
fi